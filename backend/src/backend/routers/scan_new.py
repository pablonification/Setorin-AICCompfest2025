from __future__ import annotations

import logging
from typing import Any, Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends

from ..services.opencv_service import BottleMeasurer, MeasurementError
from ..services.roboflow_service import RoboflowClient
from ..services.validation_service import validate_scan
from ..services.transaction_service import get_transaction_service
from ..db.mongo import ensure_connection
from ..schemas.scan import ScanResponse
from ..services.iot_client import SmartBinClient
from ..services.ws_manager import manager
from ..services.reward_service import add_points
from ..routers.auth import verify_token
import base64
from pathlib import Path
from uuid import uuid4

# Create router with explicit prefix
router = APIRouter(prefix="/scan", tags=["scan"])
logger = logging.getLogger(__name__)

# Initialize services
bottle_measurer = BottleMeasurer()
roboflow_client = RoboflowClient()
smartbin_client = SmartBinClient()
transaction_service = get_transaction_service()


@router.post("/", response_model=ScanResponse, status_code=status.HTTP_200_OK)
async def scan_bottle(
    image: UploadFile = File(...),
    payload: dict = Depends(verify_token),
) -> Any:
    """Handle bottle scanning."""
    
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty image upload")

    # Get user email from JWT payload
    user_email = payload.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="Invalid user token")

    # OpenCV measurement
    try:
        measurement, preview_bytes = bottle_measurer.measure(content, return_debug=True)
        preview_b64: str | None = base64.b64encode(preview_bytes).decode()
        
        # Save debug image
        debug_dir = Path("debug_images")
        debug_dir.mkdir(exist_ok=True)
        filename = f"{uuid4().hex}.jpg"
        (debug_dir / filename).write_bytes(preview_bytes)
        debug_url = f"/debug/{filename}"
        
    except MeasurementError as exc:
        logger.warning("Measurement failed: %s", exc)
        raise HTTPException(status_code=422, detail="Unable to measure bottle") from exc

    # Roboflow predictions
    try:
        predictions = await roboflow_client.predict(content)
    except Exception as exc:
        logger.error("Roboflow error: %s", exc)
        raise HTTPException(status_code=502, detail="Error contacting AI service") from exc

    # Validation
    validation_result = validate_scan(measurement, predictions)

    # IoT bin control
    iot_events = []
    if validation_result.is_valid:
        iot_events = await smartbin_client.open_bin()

    # Add points
    user_total_points: Optional[int] = None
    if validation_result.is_valid and user_email:
        user_total_points = await add_points(user_email, validation_result.points_awarded)

    # Store scan result
    scan_id = None
    try:
        db = await ensure_connection()
        scan_result = await db["scans"].insert_one({
            "brand": validation_result.brand,
            "confidence": validation_result.confidence,
            "measurement": validation_result.measurement.__dict__,
            "points": validation_result.points_awarded,
            "valid": validation_result.is_valid,
            "reason": validation_result.reason,
            "iot_events": iot_events,
            "user_email": user_email,
            "timestamp": datetime.now(timezone.utc),
        })
        scan_id = str(scan_result.inserted_id)
        logger.info("Scan saved successfully with ID: %s", scan_id)
    except Exception as exc:
        logger.error("Failed to save scan to DB: %s", exc)

    # Create transaction record
    transaction_id = None
    if scan_id and validation_result.is_valid and user_email and validation_result.points_awarded > 0:
        try:
            user_id = user_email
            created_transaction = await transaction_service.create_transaction_after_scan(
                user_id=user_id,
                scan_id=scan_id,
                points_awarded=validation_result.points_awarded
            )
            
            if created_transaction:
                transaction_id = str(created_transaction.id)
                logger.info("Transaction created successfully with ID: %s for scan: %s", 
                           transaction_id, scan_id)
            else:
                logger.warning("Failed to create transaction for scan: %s", scan_id)
                
        except Exception as exc:
            logger.error("Failed to create transaction for scan %s: %s", scan_id, exc)

    # Broadcast to WebSocket clients
    await manager.broadcast({
        "type": "scan_result",
        "data": {
            "scan_id": scan_id,
            "transaction_id": transaction_id,
            "brand": validation_result.brand,
            "confidence": validation_result.confidence,
            "diameter_mm": validation_result.measurement.diameter_mm,
            "height_mm": validation_result.measurement.height_mm,
            "volume_ml": validation_result.measurement.volume_ml,
            "points": validation_result.points_awarded,
            "total_points": user_total_points,
            "valid": validation_result.is_valid,
            "events": iot_events,
            "email": user_email,
            "debug_url": debug_url,
            "debug_image": preview_b64,
        }
    })

    # Return response
    resp = ScanResponse(
        scan_id=scan_id,
        transaction_id=transaction_id,
        is_valid=validation_result.is_valid,
        reason=validation_result.reason,
        brand=validation_result.brand,
        confidence=validation_result.confidence,
        diameter_mm=validation_result.measurement.diameter_mm,
        height_mm=validation_result.measurement.height_mm,
        volume_ml=validation_result.measurement.volume_ml,
        points_awarded=validation_result.points_awarded,
        total_points=user_total_points,
        debug_image=preview_b64,
        debug_url=debug_url,
    )
    
    # Add payout transparency fields
    try:
        from ..services.payout_service import compute_payout
        payout_ctx = compute_payout(validation_result.measurement, predictions, cleanliness_key="clean_dry", cap_label_key="mixed")
        if payout_ctx.payout_rp is not None:
            resp.size_key = payout_ctx.size_key
            resp.weight_g_used = payout_ctx.weight_g_used
            resp.price_per_kg = payout_ctx.price_per_kg
            resp.k_brand = payout_ctx.k_brand
            resp.k_conf = payout_ctx.k_conf if payout_ctx.k_conf is not None else None
            resp.k_clean = payout_ctx.k_clean
            resp.k_cap = payout_ctx.k_cap
            resp.base_rp = payout_ctx.base_rp
    except Exception:
        pass
    
    return resp


# Add route without trailing slash to prevent 307 redirects
@router.post("", response_model=ScanResponse, status_code=status.HTTP_200_OK)
async def scan_bottle_no_slash(
    image: UploadFile = File(...),
    payload: dict = Depends(verify_token),
) -> Any:
    """Alias for scan_bottle to handle calls without trailing slash."""
    return await scan_bottle(image=image, payload=payload)


@router.get("/transactions", response_model=List[dict])
async def get_user_transactions(payload: dict = Depends(verify_token)):
    """Get user's scan and reward history"""
    try:
        user_email = payload.get("email")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        # Return mock data for development
        mock_transactions = [
            {
                "id": "mock_1",
                "brand": "Aqua",
                "confidence": 0.95,
                "valid": True,
                "points": 10,
                "timestamp": "2024-01-15T10:30:00Z",
                "measurement": {
                    "volume_ml": 600.0,
                    "diameter_mm": 65.0,
                    "height_mm": 180.0
                },
                "reason": "Valid bottle scan"
            },
            {
                "id": "mock_2", 
                "brand": "Le Minerale",
                "confidence": 0.92,
                "valid": True,
                "points": 8,
                "timestamp": "2024-01-14T15:45:00Z",
                "measurement": {
                    "volume_ml": 500.0,
                    "diameter_mm": 60.0,
                    "height_mm": 175.0
                },
                "reason": "Valid bottle scan"
            }
        ]
        
        return mock_transactions
        
    except Exception as exc:
        logger.error("Failed to fetch user transactions: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch transaction history")


@router.get("/transactions/summary")
async def get_user_transaction_summary(payload: dict = Depends(verify_token)):
    """Get user's transaction summary and statistics"""
    try:
        user_email = payload.get("email")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        # Mock summary data
        summary = {
            "total_scans": 2,
            "valid_scans": 2,
            "total_points": 18,
            "success_rate": 100.0,
            "average_confidence": 0.935,
            "total_volume_ml": 1100.0
        }
        
        return summary
        
    except Exception as exc:
        logger.error("Failed to fetch transaction summary: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch transaction summary")

