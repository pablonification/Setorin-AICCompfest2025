from __future__ import annotations

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel
import asyncio

from ..db.mongo import ensure_connection
from ..services.ws_manager import manager

router = APIRouter(prefix="/api/esp32", tags=["esp32"])
logger = logging.getLogger(__name__)

# Global state for ESP32 connections (in production, use Redis/database)
esp32_connections: Dict[str, Dict[str, Any]] = {}

class ESP32Registration(BaseModel):
    device_id: str
    firmware_version: Optional[str] = None
    hardware_version: Optional[str] = None
    location: Optional[str] = None
    ip_address: Optional[str] = None

class ESP32Status(BaseModel):
    device_id: str
    status: str  # "online", "offline", "error"
    last_seen: datetime
    battery_level: Optional[int] = None
    temperature: Optional[float] = None
    error_message: Optional[str] = None

class LidControlRequest(BaseModel):
    device_id: str
    action: str  # "open", "close", "status"
    duration_seconds: Optional[int] = 3  # Default 3 seconds for open

class ActionLog(BaseModel):
    device_id: str
    action: str
    timestamp: datetime
    status: str  # "success", "error", "pending"
    details: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_esp32_device(registration: ESP32Registration):
    """Register an ESP32 device with the system."""
    try:
        device_id = registration.device_id

        # Store in memory (in production, store in database)
        esp32_connections[device_id] = {
            "device_id": device_id,
            "firmware_version": registration.firmware_version,
            "hardware_version": registration.hardware_version,
            "location": registration.location,
            "ip_address": registration.ip_address,
            "status": "online",
            "last_seen": datetime.now(timezone.utc),
            "registered_at": datetime.now(timezone.utc)
        }

        # Log to database
        db = await ensure_connection()
        await db["esp32_devices"].insert_one({
            **esp32_connections[device_id],
            "action": "register"
        })

        logger.info("ESP32 device registered: %s", device_id)

        # Broadcast registration to connected clients
        await manager.broadcast_notification({
            "type": "esp32_status",
            "data": {
                "device_id": device_id,
                "status": "online",
                "action": "registered"
            }
        })

        return {
            "message": "Device registered successfully",
            "device_id": device_id,
            "status": "online"
        }

    except Exception as exc:
        logger.error("Failed to register ESP32 device: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to register device")

@router.post("/status", status_code=status.HTTP_200_OK)
async def update_esp32_status(status_update: ESP32Status, background_tasks: BackgroundTasks):
    """Update ESP32 device status."""
    try:
        device_id = status_update.device_id

        # Update in-memory state
        if device_id in esp32_connections:
            esp32_connections[device_id].update({
                "status": status_update.status,
                "last_seen": status_update.last_seen,
                "battery_level": status_update.battery_level,
                "temperature": status_update.temperature,
                "error_message": status_update.error_message
            })

        # Log to database
        db = await ensure_connection()
        await db["esp32_logs"].insert_one({
            "device_id": device_id,
            "action": "status_update",
            "status": status_update.status,
            "battery_level": status_update.battery_level,
            "temperature": status_update.temperature,
            "error_message": status_update.error_message,
            "timestamp": datetime.now(timezone.utc)
        })

        logger.info("ESP32 status updated: %s - %s", device_id, status_update.status)

        # Broadcast status update to connected clients
        background_tasks.add_task(
            manager.broadcast_notification,
            {
                "type": "esp32_status",
                "data": {
                    "device_id": device_id,
                    "status": status_update.status,
                    "battery_level": status_update.battery_level,
                    "temperature": status_update.temperature,
                    "last_seen": status_update.last_seen.isoformat()
                }
            }
        )

        return {"message": "Status updated successfully"}

    except Exception as exc:
        logger.error("Failed to update ESP32 status: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to update status")

@router.post("/control", status_code=status.HTTP_200_OK)
async def control_lid(request: LidControlRequest, background_tasks: BackgroundTasks):
    """Control ESP32 lid operations."""
    try:
        device_id = request.device_id
        action = request.action

        # Log the action
        db = await ensure_connection()
        action_log = {
            "device_id": device_id,
            "action": action,
            "timestamp": datetime.now(timezone.utc),
            "status": "pending",
            "details": {"duration_seconds": request.duration_seconds}
        }

        log_result = await db["esp32_logs"].insert_one(action_log)
        action_id = str(log_result.inserted_id)
        logger.info("Created action log with ID: %s", action_id)

        logger.info("ESP32 lid control: %s - %s", device_id, action)

        # Handle different actions
        if action == "open":
            # For opening, we need to sequence: open -> wait -> close
            logger.info("Starting background task for lid open sequence")
            # Start the background task
            asyncio.create_task(handle_lid_open_sequence(device_id, request.duration_seconds or 3, action_id))
            response_message = f"Lid opening sequence started for {request.duration_seconds}s"

        elif action == "close":
            asyncio.create_task(handle_lid_close(device_id, action_id))
            response_message = "Lid closing"

        elif action == "status":
            device_status = esp32_connections.get(device_id, {}).get("status", "unknown")
            response_message = f"Device status: {device_status}"

        else:
            # Update log as error
            await db["esp32_logs"].update_one(
                {"_id": ObjectId(str(log_result.inserted_id))},
                {"$set": {"status": "error", "error_message": f"Unknown action: {action}"}}
            )
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

        # Broadcast control action to connected clients
        background_tasks.add_task(
            manager.broadcast_notification,
            {
                "type": "esp32_control",
                "data": {
                    "device_id": device_id,
                    "action": action,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "action_id": action_id
                }
            }
        )

        return {
            "message": response_message,
            "device_id": device_id,
            "action": action,
            "action_id": action_id
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to control ESP32 lid: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to control lid")

@router.get("/devices", response_model=List[Dict[str, Any]])
async def get_esp32_devices():
    """Get all registered ESP32 devices."""
    try:
        # Return current in-memory state
        devices = []
        for device_id, device_info in esp32_connections.items():
            devices.append({
                **device_info,
                "last_seen": device_info["last_seen"].isoformat()
            })

        return devices

    except Exception as exc:
        logger.error("Failed to get ESP32 devices: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to get devices")

@router.get("/logs", response_model=List[Dict[str, Any]])
async def get_esp32_logs(
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return")
):
    """Get ESP32 action logs."""
    try:
        db = await ensure_connection()

        # Build query
        query = {}
        if device_id:
            query["device_id"] = device_id

        # Get logs sorted by timestamp (newest first)
        cursor = db["esp32_logs"].find(query).sort("timestamp", -1).limit(limit)

        logs = []
        async for log in cursor:
            log["id"] = str(log.pop("_id"))
            log["timestamp"] = log["timestamp"].isoformat()
            logs.append(log)

        return logs

    except Exception as exc:
        logger.error("Failed to get ESP32 logs: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to get logs")

@router.get("/logs/{action_id}", response_model=Dict[str, Any])
async def get_esp32_log_by_id(action_id: str):
    """Get a specific ESP32 log by action ID."""
    try:
        from bson import ObjectId
        db = await ensure_connection()

        log = await db["esp32_logs"].find_one({"_id": ObjectId(action_id)})
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")

        log["id"] = str(log.pop("_id"))
        log["timestamp"] = log["timestamp"].isoformat()
        return log

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get ESP32 log: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to get log")


# Background task handlers
async def handle_lid_open_sequence(device_id: str, duration_seconds: int, action_id: str):
    """Handle the lid open sequence: open -> wait -> close."""
    try:
        logger.info("Background task started for device %s with action_id %s", device_id, action_id)
        db = await ensure_connection()

        # Update initial action as in progress
        from bson import ObjectId
        logger.info("Updating action %s to in_progress", action_id)
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "in_progress", "details.sequence": "opening"}}
        )

        # Simulate lid opening (in real ESP32, this would be an HTTP call or WebSocket)
        logger.info("ESP32 %s: Opening lid", device_id)
        await asyncio.sleep(1.5)  # Simulate opening time

        # Update as lid opened
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "in_progress", "details.sequence": "opened"}}
        )

        # Broadcast lid opened event
        await manager.broadcast_notification({
            "type": "esp32_event",
            "data": {
                "device_id": device_id,
                "event": "lid_opened",
                "action_id": action_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        })

        # Wait for the specified duration (time for user to drop bottle)
        logger.info("ESP32 %s: Waiting %ds for bottle drop", device_id, duration_seconds)
        await asyncio.sleep(duration_seconds)

        # Update as waiting for close
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "in_progress", "details.sequence": "closing"}}
        )

        # Simulate sensor trigger (bottle dropped)
        logger.info("ESP32 %s: Simulating sensor trigger", device_id)
        await asyncio.sleep(1)  # Simulate sensor trigger delay

        # Update as sensor triggered
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "in_progress", "details.sequence": "sensor_triggered"}}
        )

        # Broadcast sensor triggered event
        await manager.broadcast_notification({
            "type": "esp32_event",
            "data": {
                "device_id": device_id,
                "event": "sensor_triggered",
                "action_id": action_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        })

        # Simulate lid closing
        logger.info("ESP32 %s: Closing lid", device_id)
        await asyncio.sleep(1)  # Simulate closing time

        # Update as completed
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "completed", "details.sequence": "closed"}}
        )

        # Broadcast lid closed event
        await manager.broadcast_notification({
            "type": "esp32_event",
            "data": {
                "device_id": device_id,
                "event": "lid_closed",
                "action_id": action_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        })

        logger.info("ESP32 %s: Lid sequence completed", device_id)

    except Exception as exc:
        logger.error("Error in lid open sequence for %s: %s", device_id, exc)

        # Update log as error
        try:
            db = await ensure_connection()
            await db["esp32_logs"].update_one(
                {"_id": ObjectId(action_id)},
                {"$set": {"status": "error", "error_message": str(exc)}}
            )
        except:
            pass

async def handle_lid_close(device_id: str, action_id: str):
    """Handle lid close action."""
    try:
        db = await ensure_connection()

        # Update as in progress
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "in_progress"}}
        )

        logger.info("ESP32 %s: Closing lid", device_id)
        await asyncio.sleep(1)  # Simulate closing time

        # Update as completed
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "completed"}}
        )

        # Broadcast lid closed event
        await manager.broadcast_notification({
            "type": "esp32_event",
            "data": {
                "device_id": device_id,
                "event": "lid_closed",
                "action_id": action_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        })

        logger.info("ESP32 %s: Lid closed", device_id)

    except Exception as exc:
        logger.error("Error closing lid for %s: %s", device_id, exc)

        # Update log as error
        try:
            db = await ensure_connection()
            await db["esp32_logs"].update_one(
                {"_id": ObjectId(action_id)},
                {"$set": {"status": "error", "error_message": str(exc)}}
            )
        except:
            pass
