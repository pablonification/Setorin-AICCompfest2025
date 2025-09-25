from __future__ import annotations

import logging
from typing import Any, Optional, List
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends, Query

from ..services.opencv_service import BottleMeasurer, MeasurementError, MeasurementResult
from ..services.roboflow_service import RoboflowClient
from ..services.validation_service import validate_scan
from ..services.transaction_service import get_transaction_service
from ..db.mongo import ensure_connection
from ..schemas.scan import ScanResponse
from ..services.iot_client import SmartBinClient
from ..services.ws_manager import manager
from ..services.reward_service import add_points
from ..routers.auth import verify_token
from ..services.deposit_waiter import wait_for as wait_for_deposit_signal

import asyncio
import base64
from pathlib import Path
from uuid import uuid4
import httpx
from bson import ObjectId

router = APIRouter(prefix="/api/scan", tags=["scan"])
logger = logging.getLogger(__name__)

# Initialize with optimized parameters from Colab testing (0.7, 1.8, 1.6, 0.9, 1.4)
bottle_measurer = BottleMeasurer(
    detector_weight_area=0.7,
    detector_weight_aspect=1.8,
    detector_weight_vertical=1.6,
    detector_weight_solidity=0.9,
    detector_weight_border=1.4,
    classify=True
)
roboflow_client = RoboflowClient()
smartbin_client = SmartBinClient()
transaction_service = get_transaction_service()


async def control_esp32_lid(
    device_id: str,
    duration_seconds: int = 8,
    *,
    requested_by_user_email: str | None = None,
    requested_by_user_id: str | None = None,
) -> dict:
    """Control ESP32 lid via /api/esp32/control and return {events, action_id}."""
    from ..core.config import get_settings

    settings = get_settings()
    backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
    esp32_control_url = f"{backend_url}/api/esp32/control"

    payload: dict[str, Any] = {
        "device_id": device_id,
        "action": "open",
        "duration_seconds": duration_seconds,
    }
    if requested_by_user_id:
        payload["requested_by_user_id"] = requested_by_user_id
    if requested_by_user_email:
        payload["requested_by_user_email"] = requested_by_user_email

    logger.info("Calling ESP32 control endpoint: %s with payload: %s", esp32_control_url, payload)

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(esp32_control_url, json=payload, headers={"Content-Type": "application/json"})
        if resp.status_code != 200:
            raise RuntimeError(f"ESP32 control failed: {resp.status_code} {resp.text}")
        data = resp.json()
        action_id = data.get("action_id")
        events = [{
            "event": "lid_open_sequence_started",
            "status": "success",
            "response": data,
        }]
        return {"events": events, "action_id": action_id}


async def wait_for_deposit_event(action_id: str, timeout_seconds: int = 8) -> dict | None:
    """Wait up to timeout_seconds for a deposit event correlated with action_id."""
    if not action_id:
        return None
    # First, try an in-memory push-style signal (no DB polling)
    pushed = await wait_for_deposit_signal(action_id, timeout_seconds=timeout_seconds)
    if pushed:
        return pushed

    # Fallback: DB polling for environments with multiple workers or after cache expiry
    db = await ensure_connection()
    deadline = datetime.now(timezone(timedelta(hours=7))) + timedelta(seconds=timeout_seconds)
    poll_interval = 0.25
    while datetime.now(timezone(timedelta(hours=7))) < deadline:
        # Try esp32_deposits first (written by esp32_deposit_service)
        doc = await db["esp32_deposits"].find_one({"action_id": action_id})
        if doc:
            return doc
        # Fallback to esp32_logs.details updated by the service
        log_doc = await db["esp32_logs"].find_one({"_id": ObjectId(action_id)})
        details = (log_doc or {}).get("details", {})
        if details.get("deposit_event") in {"detected", "timeout"}:
            return {
                "action_id": action_id,
                "event": details.get("deposit_event"),
                "baseline_distance": details.get("deposit_baseline_cm"),
                "current_distance": details.get("deposit_current_cm"),
                "delta_cm": details.get("deposit_delta_cm"),
                "timestamp": details.get("deposit_timestamp"),
            }
        await asyncio.sleep(poll_interval)
    return None


@router.options("")
async def scan_options_no_slash():
    """Handle CORS preflight for scan endpoint without slash."""
    return {"message": "OK"}


@router.options("/")
async def scan_options_with_slash():
    """Handle CORS preflight for scan endpoint with slash."""
    return {"message": "OK"}


@router.post("/", response_model=ScanResponse, status_code=status.HTTP_200_OK)
async def scan_bottle(
    image: UploadFile = File(...),
    payload: dict = Depends(verify_token),
    device_id: str = Query("ESP32-SPARTANS", description="ESP32 device ID to control"),
    duration_seconds: int = Query(8, ge=1, le=15, description="Max time to keep lid open waiting for deposit (seconds)"),
) -> Any:  # noqa: WPS110
    """Handle bottle scanning.

    1. Read image bytes.
    2. Run OpenCV measurement.
    3. Call Roboflow for brand prediction.
    4. Validate and compute reward.
    5. Open ESP32 bin lid if valid and wait for deposit.
    6. Store result in MongoDB.
    7. Return validation payload.
    """
    logger.info("Scan request received from user: %s", payload.get("email", "unknown"))

    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty image upload")

    # Get user email from JWT payload
    user_email = payload.get("email")
    if not user_email:
        raise HTTPException(status_code=401, detail="Invalid user token")

    # Prepare DB handle early for later use
    db = await ensure_connection()

    # 2-3. Predictions and measurement (order depends on feature flag)
    from ..core.config import get_settings
    settings = get_settings()
    predictions: list = []

    preview_b64: str | None = None  # ensure always defined
    debug_url: str | None = None

    if settings.USE_DETECTION_ROI_FUSION:
        # Fetch predictions first to allow ROI fusion
        try:
            predictions = await roboflow_client.predict(content)
            logger.info("Roboflow predictions received: %s", predictions)
        except Exception as exc:  # noqa: BLE001
            logger.error("Roboflow error (continuing without boxes): %s", exc)
            predictions = []

        try:
            measurement, preview_bytes = bottle_measurer.measure(content, predictions=predictions, return_debug=True)
            preview_b64 = base64.b64encode(preview_bytes).decode()
            debug_dir = Path("debug_images")
            debug_dir.mkdir(exist_ok=True)
            filename = f"{uuid4().hex}.jpg"
            (debug_dir / filename).write_bytes(preview_bytes)
            debug_url = f"/debug/{filename}"
        except MeasurementError as exc:
            logger.warning("Measurement failed – continuing with fallback measurement: %s", exc)
            measurement = MeasurementResult(diameter_mm=65.0, height_mm=180.0, volume_ml=600.0)
            preview_b64 = None
            debug_url = None
    else:
        # Original order: measure first, predictions second
        try:
            measurement, preview_bytes = bottle_measurer.measure(content, return_debug=True)
            preview_b64 = base64.b64encode(preview_bytes).decode()
            debug_dir = Path("debug_images")
            debug_dir.mkdir(exist_ok=True)
            filename = f"{uuid4().hex}.jpg"
            (debug_dir / filename).write_bytes(preview_bytes)
            debug_url = f"/debug/{filename}"
        except MeasurementError as exc:
            logger.warning("Measurement failed – continuing with fallback measurement: %s", exc)
            measurement = MeasurementResult(diameter_mm=65.0, height_mm=180.0, volume_ml=600.0)
            preview_b64 = None
            debug_url = None

        try:
            predictions = await roboflow_client.predict(content)
            logger.info("Roboflow predictions received: %s", predictions)
        except Exception as exc:  # noqa: BLE001
            logger.error("Roboflow error: %s", exc)
            raise HTTPException(status_code=502, detail="Error contacting AI service") from exc

    # 4. Validation
    validation_result = validate_scan(measurement, predictions)
    logger.info(
        "Validation result: is_valid=%s, brand=%s, confidence=%s, reason=%s",
        validation_result.is_valid, validation_result.brand, validation_result.confidence, validation_result.reason,
    )

    # 5. If the bottle is valid, command ESP32 to open and wait for deposit confirmation
    iot_events: list = []
    deposit_ok = False
    deposit_info: dict | None = None
    action_id: str | None = None

    if validation_result.is_valid:
        try:
            resp = await control_esp32_lid(
                device_id,
                duration_seconds,
                requested_by_user_email=user_email,
            )
            iot_events = resp.get("events", [])
            action_id = resp.get("action_id")
        except Exception as e:
            logger.error("Failed to start ESP32 lid sequence: %s", e)
            iot_events.append({"event": "error", "message": str(e)})

        # Tag the action log to indicate scan-managed rewards (optional metadata)
        try:
            if action_id:
                db_tag = await ensure_connection()
                await db_tag["esp32_logs"].update_one(
                    {"_id": ObjectId(action_id)},
                    {"$set": {
                        "details.reward_strategy": "scan_flow",
                        "details.scan_expected_points": validation_result.points_awarded,
                    }}
                )
        except Exception as tag_exc:  # noqa: BLE001
            logger.warning("Failed to tag action log %s: %s", action_id, tag_exc)

        # Wait up to duration_seconds for deposit event
        if action_id:
            deposit_info = await wait_for_deposit_event(action_id, timeout_seconds=duration_seconds)
            if deposit_info and deposit_info.get("event") == "detected":
                deposit_ok = True

    # Award points only if deposit confirmed
    user_total_points: Optional[int] = None
    if deposit_ok and user_email:
        try:
            user_total_points = await add_points(user_email, validation_result.points_awarded)
        except Exception as award_exc:  # noqa: BLE001
            logger.error("Failed to award points to %s: %s", user_email, award_exc)

    # 6. Store to MongoDB (best-effort)
    scan_id = None
    try:
        scan_result = await db["scans"].insert_one({
            "brand": validation_result.brand,
            "confidence": validation_result.confidence,
            "measurement": validation_result.measurement.__dict__,
            "points": (validation_result.points_awarded if deposit_ok else 0),
            "valid": (validation_result.is_valid and deposit_ok),
            "reason": (validation_result.reason if deposit_ok else "No deposit detected"),
            "iot_events": iot_events,
            "deposit_event": (deposit_info or None),
            "esp32_action_id": action_id,
            "user_email": user_email,
            "timestamp": datetime.now(timezone(timedelta(hours=7))),
        })
        scan_id = str(scan_result.inserted_id)
        logger.info("Scan saved successfully with ID: %s", scan_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to save scan to DB: %s", exc)

    # 6.5. Create transaction record if scan was successful and valid
    transaction_id = None
    if scan_id and deposit_ok and user_email and validation_result.points_awarded > 0:
        try:
            # Resolve user's ObjectId by email for transactions
            user_doc = await db["users"].find_one({"email": user_email})
            user_id = str(user_doc["_id"]) if user_doc else None
            if not user_id:
                logger.warning("Could not resolve user_id for email %s; skipping transaction creation", user_email)
                raise RuntimeError("User not found for transaction creation")

            created_transaction = await transaction_service.create_transaction_after_scan(
                user_id=user_id,
                scan_id=scan_id,
                points_awarded=validation_result.points_awarded
            )
            if created_transaction:
                transaction_id = str(created_transaction.id)
                logger.info("Transaction created successfully with ID: %s for scan: %s", transaction_id, scan_id)
            else:
                logger.warning("Failed to create transaction for scan: %s", scan_id)
        except Exception as exc:
            logger.error("Failed to create transaction for scan %s: %s", scan_id, exc)
            # Don't fail the scan if transaction creation fails

    # 7. Broadcast to connected WS clients
    await manager.broadcast_notification({
        "type": "scan_result",
        "data": {
            "scan_id": scan_id,
            "transaction_id": transaction_id,
            "brand": validation_result.brand,
            "confidence": validation_result.confidence,
            "diameter_mm": validation_result.measurement.diameter_mm,
            "height_mm": validation_result.measurement.height_mm,
            "volume_ml": validation_result.measurement.volume_ml,
            "points": (validation_result.points_awarded if deposit_ok else 0),
            "total_points": user_total_points,
            "valid": (validation_result.is_valid and deposit_ok),
            "events": iot_events,
            "email": user_email,
            "debug_url": debug_url,
            "debug_image": preview_b64,
            "deposit": (deposit_info or {"event": "timeout"}),
        }
    })

    # 8. Return response
    resp = ScanResponse(
        scan_id=scan_id,
        transaction_id=transaction_id,
        is_valid=(validation_result.is_valid and deposit_ok),
        reason=(validation_result.reason if deposit_ok else "No deposit detected"),
        brand=validation_result.brand,
        confidence=validation_result.confidence,
        diameter_mm=validation_result.measurement.diameter_mm,
        height_mm=validation_result.measurement.height_mm,
        volume_ml=validation_result.measurement.volume_ml,
        points_awarded=(validation_result.points_awarded if deposit_ok else 0),
        total_points=user_total_points,
        debug_image=preview_b64,
        debug_url=debug_url,
    )
    # Optionally populate payout transparency
    try:
        from ..services.payout_service import compute_payout
        payout_ctx = compute_payout(
            validation_result.measurement, predictions, cleanliness_key="clean_dry", cap_label_key="mixed"
        )
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
    device_id: str = Query("ESP32-SPARTANS", description="ESP32 device ID to control"),
    duration_seconds: int = Query(8, ge=1, le=15, description="Max time to keep lid open waiting for deposit (seconds)"),
) -> Any:
    """Alias for scan_bottle to handle calls without trailing slash."""
    logger.info("Scan request (no-slash) received from user: %s", payload.get("email", "unknown"))
    return await scan_bottle(image=image, payload=payload, device_id=device_id, duration_seconds=duration_seconds)


@router.get("/transactions", response_model=List[dict])
async def get_user_transactions(
    payload: dict = Depends(verify_token),
    limit: int = Query(default=50, ge=1, le=100),
    success: bool = Query(default=False, description="Only successful/valid scans")
):
    """Get user's scan and reward history"""
    try:
        user_email = payload.get("email")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid user token")

        db = await ensure_connection()
        query: dict = {"user_email": user_email}
        if success:
            query.update({"valid": True, "points": {"$gt": 0}})
        cursor = db["scans"].find(query).sort("timestamp", -1).limit(limit)

        scans = []
        async for scan in cursor:
            # Convert stored UTC timestamp to GMT+7 for user-facing output
            ts = scan.get("timestamp")
            if isinstance(ts, datetime):
                ts_out = ts.astimezone(timezone(timedelta(hours=7))).isoformat()
            else:
                ts_out = datetime.now(timezone(timedelta(hours=7))).isoformat()

            scans.append({
                "id": str(scan["_id"]),
                "brand": scan.get("brand", "Unknown"),
                "confidence": scan.get("confidence", 0.0),
                "valid": scan.get("valid", False),
                "points": scan.get("points", 0),
                "timestamp": ts_out,
                "measurement": scan.get("measurement", {
                    "volume_ml": 0.0,
                    "diameter_mm": 0.0,
                    "height_mm": 0.0
                }),
                "reason": scan.get("reason", "No reason provided")
            })

        logger.info("Retrieved %d scans for user %s", len(scans), user_email)
        return scans

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

        logger.info("Starting transaction summary for user: %s", user_email)

        db = await ensure_connection()
        logger.info("MongoDB connection established")

        # First check if user exists and get their current points
        user_doc = await db["users"].find_one({"email": user_email})
        total_points = (user_doc.get("points", 0) if user_doc else 0) or 0
        logger.info("User points: %s", total_points)

        # Check if scans collection exists and has data
        collections = await db.list_collection_names()
        logger.info("Available collections: %s", collections)

        if "scans" not in collections:
            logger.warning("Scans collection does not exist")
            summary = {
                "total_scans": 0,
                "valid_scans": 0,
                "total_points": total_points,
                "success_rate": 0.0,
                "average_confidence": 0.0,
                "total_volume_ml": 0.0
            }
            return summary

        # Check if there are any scans for this user
        scan_count = await db["scans"].count_documents({"user_email": user_email})
        logger.info("Found %d scans for user %s", scan_count, user_email)

        if scan_count == 0:
            summary = {
                "total_scans": 0,
                "valid_scans": 0,
                "total_points": total_points,
                "success_rate": 0.0,
                "average_confidence": 0.0,
                "total_volume_ml": 0.0
            }
            logger.info("No scans found for user %s, returning empty summary", user_email)
            return summary

        # Use a safer aggregation pipeline that handles missing fields
        pipeline = [
            {"$match": {"user_email": user_email}},
            {
                "$group": {
                    "_id": None,
                    "total_scans": {"$sum": 1},
                    "valid_scans": {"$sum": {"$cond": ["$valid", 1, 0]}},
                    "total_points": {"$sum": {"$ifNull": ["$points", 0]}},
                    "total_confidence": {"$sum": {"$ifNull": ["$confidence", 0.0]}},
                    "total_volume_ml": {"$sum": {"$ifNull": ["$measurement.volume_ml", 0.0]}},
                    "avg_confidence": {"$avg": {"$ifNull": ["$confidence", 0.0]}}
                }
            }
        ]

        try:
            logger.info("Executing aggregation pipeline")
            cursor = db["scans"].aggregate(pipeline)
            result = await cursor.next()
            logger.info("Aggregation successful, result: %s", result)
        except Exception as agg_error:
            logger.warning("Aggregation failed for user %s, using fallback: %s", user_email, agg_error)
            # Fallback: use simple find operations
            total_scans = await db["scans"].count_documents({"user_email": user_email})
            valid_scans = await db["scans"].count_documents({"user_email": user_email, "valid": True})

            summary = {
                "total_scans": total_scans,
                "valid_scans": valid_scans,
                "total_points": total_points,
                "success_rate": round((valid_scans / total_scans * 100) if total_scans > 0 else 0.0, 1),
                "average_confidence": 0.0,
                "total_volume_ml": 0.0
            }
            logger.info("Retrieved summary for user %s using fallback: %s", user_email, summary)
            return summary

        if result:
            total_scans = result.get("total_scans", 0) or 0
            valid_scans = result.get("valid_scans", 0) or 0
            total_volume_ml = result.get("total_volume_ml", 0.0) or 0.0
            avg_confidence = result.get("avg_confidence", 0.0) or 0.0

            success_rate = (valid_scans / total_scans * 100) if total_scans > 0 else 0.0

            summary = {
                "total_scans": total_scans,
                "valid_scans": valid_scans,
                "total_points": total_points,
                "success_rate": round(success_rate, 1),
                "average_confidence": round(avg_confidence, 3),
                "total_volume_ml": total_volume_ml
            }
        else:
            # No scans found
            summary = {
                "total_scans": 0,
                "valid_scans": 0,
                "total_points": total_points,
                "success_rate": 0.0,
                "average_confidence": 0.0,
                "total_volume_ml": 0.0
            }

        logger.info("Retrieved summary for user %s: %s", user_email, summary)
        return summary

    except Exception as exc:
        logger.error("Failed to fetch transaction summary for user %s: %s", payload.get("email", "unknown"), str(exc), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch transaction summary")
