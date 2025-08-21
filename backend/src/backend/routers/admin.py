from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
import csv
from io import StringIO
from datetime import datetime, timedelta
from bson import ObjectId

from ..routers.auth import require_admin
from ..db.mongo import ensure_connection
from ..models.user import User
from ..models.scan import BottleScan
from ..models.transaction import Transaction

router = APIRouter(prefix="/admin", tags=["admin"])


def _serialize_mongo_doc(doc: dict) -> dict:
    """Serialize MongoDB document by converting ObjectId to string and handling other non-serializable types."""
    if not doc:
        return doc
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, dict):
            serialized[key] = _serialize_mongo_doc(value)
        elif isinstance(value, list):
            serialized[key] = [_serialize_mongo_doc(item) if isinstance(item, dict) else item for item in value]
        else:
            serialized[key] = value
    
    return serialized


@router.get("/users/count")
async def get_users_count(payload: dict = Depends(require_admin)):
    """Get total users count and total points for admin dashboard."""
    
    try:
        db = await ensure_connection()
        
        # Get total users count
        total_users = await db["users"].count_documents({})
        
        # Get total points across all users
        pipeline = [
            {"$group": {"_id": None, "total_points": {"$sum": "$points"}}}
        ]
        result = await db["users"].aggregate(pipeline).to_list(1)
        total_points = result[0]["total_points"] if result else 0
        
        return {
            "total_users": total_users,
            "total_points": total_points
        }
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to get users count: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get users count: {str(e)}")


@router.get("/users")
async def get_users(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort_by: str = Query(default="points", regex="^(points|created_at|email)$"),
    sort_order: str = Query(default="desc", regex="^(asc|desc)$"),
    payload: dict = Depends(require_admin)
):
    """Get paginated list of users for admin management."""
    
    try:
        db = await ensure_connection()
        
        # Build sort criteria
        sort_direction = -1 if sort_order == "desc" else 1
        sort_criteria = {sort_by: sort_direction}
        
        # Get users with pagination
        cursor = db["users"].find({}).sort(list(sort_criteria.items())).skip(offset).limit(limit)
        users = await cursor.to_list(length=limit)
        
        # Get total count for pagination
        total = await db["users"].count_documents({})
        
        # Get scan counts for each user and serialize documents
        serialized_users = []
        for user in users:
            user_id = str(user["_id"])
            scan_count = await db["scans"].count_documents({"user_email": user.get("email")})
            
            # Serialize the user document
            serialized_user = _serialize_mongo_doc(user)
            serialized_user["total_scans"] = scan_count
            serialized_user["id"] = user_id
            if "tier" in user:
                serialized_user["tier"] = user.get("tier")
            serialized_users.append(serialized_user)
        
        return {
            "users": serialized_users,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to get users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")


@router.get("/users/export.csv")
async def export_users_csv(payload: dict = Depends(require_admin)):
    """Export users data as CSV."""
    
    try:
        db = await ensure_connection()
        
        # Get all users
        users = await db["users"].find({}).to_list(length=None)
        
        # Create CSV
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            "id", "email", "name", "points", "tier", "created_at", "scan_ids_count"
        ])
        
        for user in users:
            scan_count = await db["scans"].count_documents({"user_email": user.get("email")})
            writer.writerow([
                str(user.get("_id", "")),
                user.get("email", ""),
                user.get("name", ""),
                user.get("points", 0),
                user.get("tier", ""),
                user.get("created_at", ""),
                scan_count
            ])
        
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=users_export.csv"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export users: {str(e)}")


@router.get("/scans/count")
async def get_scans_count(payload: dict = Depends(require_admin)):
    """Get total scans count for admin dashboard."""
    
    try:
        db = await ensure_connection()
        
        # Get total scans count
        total_scans = await db["scans"].count_documents({"valid": True})
        
        return {
            "total_scans": total_scans
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scans count: {str(e)}")


@router.get("/scans/export.csv")
async def export_scans_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    payload: dict = Depends(require_admin)
):
    """Export scans data as CSV."""
    
    try:
        db = await ensure_connection()
        
        # Build date filter if provided
        date_filter = {}
        if start_date and end_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                end_dt = datetime.fromisoformat(end_date) + timedelta(days=1)
                date_filter["timestamp"] = {"$gte": start_dt, "$lt": end_dt}
            except ValueError:
                pass
        
        # Get scans with filter
        scans = await db["scans"].find(date_filter).to_list(length=None)
        
        # Create CSV
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            "id", "user_email", "brand", "confidence", "diameter_mm", "height_mm", 
            "volume_ml", "points", "valid", "reason", "timestamp"
        ])
        
        for scan in scans:
            writer.writerow([
                str(scan.get("_id")),
                scan.get("user_email", ""),
                scan.get("brand", ""),
                scan.get("confidence", 0),
                scan.get("measurement", {}).get("diameter_mm", 0),
                scan.get("measurement", {}).get("height_mm", 0),
                scan.get("measurement", {}).get("volume_ml", 0),
                scan.get("points", 0),
                scan.get("valid", True),
                scan.get("reason", ""),
                scan.get("timestamp", "")
            ])
        
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=scans_export.csv"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export scans: {str(e)}")


@router.get("/transactions/export.csv")
async def export_transactions_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    payload: dict = Depends(require_admin)
):
    """Export transactions data as CSV."""
    
    try:
        db = await ensure_connection()
        
        # Build date filter if provided
        date_filter = {}
        if start_date and end_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                end_dt = datetime.fromisoformat(end_date) + timedelta(days=1)
                date_filter["created_at"] = {"$gte": start_dt, "$lt": end_dt}
            except ValueError:
                pass
        
        # Get transactions with filter
        transactions = await db["transactions"].find(date_filter).to_list(length=None)
        
        # Create CSV
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            "id", "user_id", "scan_id", "amount", "created_at"
        ])
        
        for transaction in transactions:
            writer.writerow([
                str(transaction.get("_id")),
                str(transaction.get("user_id", "")),
                str(transaction.get("scan_id", "")),
                transaction.get("amount", 0),
                transaction.get("created_at", "")
            ])
        
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=transactions_export.csv"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export transactions: {str(e)}")


@router.get("/statistics/export.csv")
async def export_statistics_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    payload: dict = Depends(require_admin)
):
    """Export aggregated statistics as CSV."""
    
    try:
        db = await ensure_connection()
        
        # Build date filter if provided
        date_filter = {}
        if start_date and end_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                end_dt = datetime.fromisoformat(end_date) + timedelta(days=1)
                date_filter["timestamp"] = {"$gte": start_dt, "$lt": end_dt}
            except ValueError:
                pass
        
        # Aggregate statistics
        pipeline = [
            {"$match": date_filter} if date_filter else {"$match": {}},
            {"$group": {
                "_id": None,
                "total_scans": {"$sum": 1},
                "total_points": {"$sum": "$points"},
                "total_volume": {"$sum": "$measurement.volume_ml"},
                "avg_confidence": {"$avg": "$confidence"}
            }}
        ]
        
        result = await db["scans"].aggregate(pipeline).to_list(1)
        stats = result[0] if result else {}
        
        # Create CSV
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            "metric", "value", "start_date", "end_date"
        ])
        
        writer.writerow(["total_scans", stats.get("total_scans", 0), start_date or "all", end_date or "all"])
        writer.writerow(["total_points", stats.get("total_points", 0), start_date or "all", end_date or "all"])
        writer.writerow(["total_volume_ml", stats.get("total_volume", 0), start_date or "all", end_date or "all"])
        writer.writerow(["avg_confidence", round(stats.get("avg_confidence", 0), 3), start_date or "all", end_date or "all"])
        
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=statistics_export.csv"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export statistics: {str(e)}")


@router.get("/notifications/export.csv")
async def export_notifications_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    payload: dict = Depends(require_admin)
):
    """Export notifications data as CSV."""
    
    try:
        db = await ensure_connection()
        
        # Build date filter if provided
        date_filter = {}
        if start_date and end_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                end_dt = datetime.fromisoformat(end_date) + timedelta(days=1)
                date_filter["created_at"] = {"$gte": start_dt, "$lt": end_dt}
            except ValueError:
                pass
        
        # Get notifications with filter
        notifications = await db["notifications"].find(date_filter).to_list(length=None)
        
        # Create CSV
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            "id", "user_id", "title", "message", "notification_type", "priority", 
            "is_read", "created_at"
        ])
        
        for notification in notifications:
            writer.writerow([
                str(notification.get("_id")),
                str(notification.get("user_id", "")),
                notification.get("title", ""),
                notification.get("message", ""),
                notification.get("notification_type", ""),
                notification.get("priority", 0),
                notification.get("is_read", False),
                notification.get("created_at", "")
            ])
        
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=notifications_export.csv"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export notifications: {str(e)}")
