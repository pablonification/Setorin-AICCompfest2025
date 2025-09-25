from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from pydantic import BaseModel, Field

from ..db.mongo import ensure_connection
from ..services.ws_manager import manager
from ..services.reward_service import add_points

logger = logging.getLogger(__name__)


class ESP32DepositEvent(BaseModel):
    """Payload sent by ESP32 when deposit detection finishes."""
    type: str = Field(default="deposit_event")
    device_id: str
    event: str  # "detected" | "timeout"
    timestamp: datetime
    baseline_distance: Optional[float] = None
    current_distance: Optional[float] = None
    delta_cm: Optional[float] = None
    action_id: Optional[str] = None
    firmware_version: Optional[str] = None


POINTS_PER_BOTTLE = 100  # default reward points for a successful deposit


async def _find_user_email_by_id(user_id: str) -> Optional[str]:
    try:
        from bson import ObjectId
        db = await ensure_connection()
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
        if user:
            return user.get("email")
    except Exception as e:
        logger.warning("Failed to lookup user by id %s: %s", user_id, e)
    return None


async def _extract_requester_from_action(action_id: str) -> Dict[str, Optional[str]]:
    """Return requester info stored with action log, if any."""
    try:
        from bson import ObjectId
        db = await ensure_connection()
        log = await db["esp32_logs"].find_one({"_id": ObjectId(action_id)})
        if not log:
            return {"user_id": None, "email": None}
        details = (log.get("details") or {})
        user_id = details.get("requested_by_user_id")
        email = details.get("requested_by_user_email")
        return {"user_id": user_id, "email": email}
    except Exception as e:
        logger.warning("Failed to fetch action log %s: %s", action_id, e)
        return {"user_id": None, "email": None}


async def handle_deposit_event(event: ESP32DepositEvent) -> Dict[str, Any]:
    """Persist deposit event, broadcast to clients, and award points if applicable."""
    try:
        db = await ensure_connection()

        # Persist to esp32_deposits collection
        deposit_doc = event.model_dump()
        deposit_doc["created_at"] = datetime.now(timezone.utc)
        await db["esp32_deposits"].insert_one(deposit_doc)

        # Update esp32_logs if action_id is provided
        requester_email: Optional[str] = None
        requester_user_id: Optional[str] = None

        if event.action_id:
            from bson import ObjectId
            update = {
                "$set": {
                    "details.deposit_event": event.event,
                    "details.deposit_delta_cm": event.delta_cm,
                    "details.deposit_current_cm": event.current_distance,
                    "details.deposit_baseline_cm": event.baseline_distance,
                    "details.deposit_timestamp": event.timestamp,
                }
            }
            await db["esp32_logs"].update_one({"_id": ObjectId(event.action_id)}, update)

            # try to read requester info for reward
            requester = await _extract_requester_from_action(event.action_id)
            requester_user_id = requester.get("user_id")
            requester_email = requester.get("email")

        # Broadcast to all app clients
        await manager.broadcast_notification({
            "type": "esp32_event",
            "data": {
                "device_id": event.device_id,
                "event": "deposit_detected" if event.event == "detected" else "deposit_timeout",
                "action_id": event.action_id,
                "baseline_distance": event.baseline_distance,
                "current_distance": event.current_distance,
                "delta_cm": event.delta_cm,
                "timestamp": event.timestamp.isoformat(),
            },
        })

        # Award points for detected events if a requester user can be identified
        awarded_points: Optional[int] = None
        if event.event == "detected":
            email_for_reward: Optional[str] = requester_email
            if not email_for_reward and requester_user_id:
                email_for_reward = await _find_user_email_by_id(requester_user_id)

            if email_for_reward:
                try:
                    awarded_total = await add_points(email_for_reward, POINTS_PER_BOTTLE, bottle_count=1)
                    awarded_points = POINTS_PER_BOTTLE
                    logger.info("Awarded %d points to %s; new total %s", POINTS_PER_BOTTLE, email_for_reward, awarded_total)
                except Exception as e:
                    logger.error("Failed to award points to %s: %s", email_for_reward, e)

        return {
            "status": "ok",
            "awarded_points": awarded_points,
        }

    except Exception as e:
        logger.exception("Error handling deposit event: %s", e)
        return {"status": "error", "error": str(e)}
