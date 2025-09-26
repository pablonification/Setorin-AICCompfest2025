from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from ..db.mongo import ensure_connection
from ..services.deposit_waiter import wait_for as wait_for_deposit_event
from ..services.reward_service import add_points
from ..services.transaction_service import get_transaction_service
from ..services.ws_manager import manager
from bson import ObjectId

logger = logging.getLogger(__name__)


class DepositDetectionService:
    """Background service to detect deposits and confirm scans automatically"""
    
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the background deposit detection service"""
        if self._running:
            logger.warning("Deposit detection service is already running")
            return
        
        self._running = True
        self._task = asyncio.create_task(self._detection_loop())
        logger.info("Deposit detection service started")
    
    async def stop(self):
        """Stop the background deposit detection service"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass  # Expected when cancelling
        logger.info("Deposit detection service stopped")
    
    async def _detection_loop(self):
        """Main detection loop"""
        while self._running:
            try:
                await self._process_pending_scans()
                await asyncio.sleep(1)  # Check every second
            except asyncio.CancelledError:
                break  # Exit loop when cancelled
            except Exception as e:
                logger.error("Deposit detection service error: %s", e)
                await asyncio.sleep(5)  # Wait longer on error
    
    async def _process_pending_scans(self):
        """Process all pending deposit scans"""
        try:
            db = await ensure_connection()
            
            # Find pending scans that haven't timed out
            now = datetime.now(timezone(timedelta(hours=7)))
            pending_scans = await db["scans"].find({
                "status": "PENDING_DEPOSIT",
                "deposit_timeout": {"$gt": now}
            }).to_list(length=100)
            
            for scan in pending_scans:
                await self._check_scan_for_deposit(scan)
        except Exception as e:
            logger.error("Error processing pending scans: %s", e)
    
    async def _check_scan_for_deposit(self, scan: dict):
        """Check a single scan for deposit events"""
        try:
            action_id = scan.get("esp32_action_id")
            if not action_id:
                return
            
            # Check for deposit event (with short timeout for non-blocking check)
            deposit_info = await wait_for_deposit_event(action_id, timeout_seconds=1)
            if deposit_info and deposit_info.get("event") == "detected":
                logger.info("Auto-detected deposit for scan %s", scan["_id"])
                await self._confirm_deposit_internal(scan["_id"], scan["user_email"])
        except Exception as e:
            logger.error("Error checking scan %s for deposit: %s", scan["_id"], e)
    
    async def _confirm_deposit_internal(self, scan_id: ObjectId, user_email: str):
        """Internal method to confirm deposit"""
        try:
            db = await ensure_connection()
            
            # Update scan status
            now = datetime.now(timezone(timedelta(hours=7)))
            result = await db["scans"].update_one(
                {"_id": scan_id, "status": "PENDING_DEPOSIT"},
                {
                    "$set": {
                        "status": "DEPOSIT_CONFIRMED",
                        "valid": True,
                        "deposit_confirmed_at": now,
                        "manual_confirmation": False,
                    }
                }
            )
            
            if result.modified_count == 0:
                logger.warning("Scan %s was not updated (already processed?)", scan_id)
                return
            
            # Get scan info for points
            scan_doc = await db["scans"].find_one({"_id": scan_id})
            if not scan_doc:
                logger.error("Scan %s not found after update", scan_id)
                return
            
            points_awarded = scan_doc.get("points", 0)
            user_total_points = 0
            
            # Award points
            if points_awarded > 0:
                try:
                    user_total_points = await add_points(user_email, points_awarded)
                    logger.info("Auto-awarded %d points to %s", points_awarded, user_email)
                except Exception as exc:
                    logger.error("Failed to auto-award points to %s: %s", user_email, exc)
            
            # Create transaction
            transaction_id = None
            if points_awarded > 0:
                try:
                    user_doc = await db["users"].find_one({"email": user_email})
                    if user_doc:
                        transaction_service = get_transaction_service()
                        created_transaction = await transaction_service.create_transaction_after_scan(
                            user_id=str(user_doc["_id"]),
                            scan_id=str(scan_id),
                            points_awarded=points_awarded
                        )
                        if created_transaction:
                            transaction_id = str(created_transaction.id)
                except Exception as exc:
                    logger.error("Failed to create transaction for auto-confirmed scan %s: %s", scan_id, exc)
            
            # Broadcast confirmation
            await manager.broadcast_notification({
                "type": "deposit_confirmed",
                "data": {
                    "scan_id": str(scan_id),
                    "transaction_id": transaction_id,
                    "user_email": user_email,
                    "points_awarded": points_awarded,
                    "total_points": user_total_points,
                    "manual_confirmation": False,
                }
            })
            
        except Exception as e:
            logger.error("Error in _confirm_deposit_internal for scan %s: %s", scan_id, e)


# Global service instance
_deposit_service: Optional[DepositDetectionService] = None


def get_deposit_service() -> DepositDetectionService:
    """Get or create the global deposit detection service"""
    global _deposit_service
    if _deposit_service is None:
        _deposit_service = DepositDetectionService()
    return _deposit_service


async def start_deposit_service():
    """Start the global deposit detection service"""
    service = get_deposit_service()
    await service.start()


async def stop_deposit_service():
    """Stop the global deposit detection service"""
    service = get_deposit_service()
    await service.stop()