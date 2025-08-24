from __future__ import annotations

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel
import asyncio

from ..db.mongo import ensure_connection
from ..services.ws_manager import manager
from ..services.iot_client import SmartBinClient
from bson import ObjectId

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
                {"_id": ObjectId(action_id)},
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

@router.get("/commands/{device_id}", response_model=List[Dict[str, Any]])
async def get_pending_commands(device_id: str):
    """Get pending commands for ESP32 to execute (polling approach)."""
    try:
        db = await ensure_connection()

        # Get pending commands for this device
        query = {
            "device_id": device_id,
            "status": "pending"
        }

        cursor = db["esp32_commands"].find(query).sort("timestamp", -1).limit(10)

        commands = []
        async for command in cursor:
            command["id"] = str(command.pop("_id"))
            command["timestamp"] = command["timestamp"].isoformat()
            commands.append(command)

        return commands

    except Exception as exc:
        logger.error("Failed to get pending commands for %s: %s", device_id, exc)
        raise HTTPException(status_code=500, detail="Failed to get commands")

@router.put("/commands/{command_id}/complete", status_code=status.HTTP_200_OK)
async def mark_command_complete(command_id: str):
    """Mark a command as completed by ESP32."""
    try:
        db = await ensure_connection()

        result = await db["esp32_commands"].update_one(
            {"_id": ObjectId(command_id)},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Command not found")

        return {"message": "Command marked as completed"}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to mark command complete: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to update command")


# Helper functions
async def queue_command_for_esp32(device_id: str, action: str, duration_seconds: int = 3):
    """Queue a command for ESP32 to poll later."""
    try:
        db = await ensure_connection()

        command_data = {
            "device_id": device_id,
            "action": action,
            "duration_seconds": duration_seconds,
            "status": "pending",
            "timestamp": datetime.now(timezone.utc)
        }

        await db["esp32_commands"].insert_one(command_data)
        logger.info("Command queued for ESP32 %s: %s", device_id, action)

    except Exception as exc:
        logger.error("Failed to queue command for %s: %s", device_id, exc)
        raise

# Background task handlers
async def handle_lid_open_sequence(device_id: str, duration_seconds: int, action_id: str):
    """Handle the lid open sequence: open -> wait -> close."""
    try:
        logger.info("Background task started for device %s with action_id %s", device_id, action_id)
        db = await ensure_connection()

        # Update initial action as in progress
        logger.info("Updating action %s to in_progress", action_id)
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "in_progress", "details.sequence": "opening"}}
        )

        # Real hardware communication - use IoT client
        logger.info("ESP32 %s: Opening lid via hardware", device_id)

        # Broadcast lid opening event
        await manager.broadcast_notification({
            "type": "esp32_event",
            "data": {
                "device_id": device_id,
                "event": "lid_opening",
                "action_id": action_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        })

        # Get device IP address from connections
        device_info = esp32_connections.get(device_id)
        if not device_info:
            logger.error("ESP32 device %s not registered", device_id)
            raise HTTPException(status_code=404, detail=f"ESP32 device {device_id} not found or not registered")

        device_ip = device_info.get("ip_address")

        # Try direct IP communication first (if IP is available)
        if device_ip:
            logger.info("ESP32 %s found at IP: %s - attempting direct communication", device_id, device_ip)
            iot_client = SmartBinClient(esp32_ip=device_ip)
            events = await iot_client.open_bin(device_id=device_id, duration_seconds=duration_seconds)

            # Check if direct communication succeeded
            if any(event.get("event") == "lid_opened" and event.get("status") == "success" for event in events):
                logger.info("Direct IP communication successful for %s", device_id)
            else:
                logger.warning("Direct IP communication failed for %s, falling back to command queuing", device_id)
                # Fall back to command queuing
                await queue_command_for_esp32(device_id, action, duration_seconds)
                events = [{"event": "command_queued", "status": "success"}]
        else:
            # No IP available, use command queuing
            logger.info("No IP address available for %s, using command queuing", device_id)
            await queue_command_for_esp32(device_id, action, duration_seconds)
            events = [{"event": "command_queued", "status": "success"}]

        # Update as lid opened
        await db["esp32_logs"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"status": "in_progress", "details.sequence": "opened", "hardware_events": events}}
        )

        # Broadcast lid opened event
        await manager.broadcast_notification({
            "type": "esp32_event",
            "data": {
                "device_id": device_id,
                "event": "lid_opened",
                "action_id": action_id,
                "hardware_events": events,
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

        # The IoT client should handle the closing automatically
        # but we'll broadcast the closing event for consistency
        await manager.broadcast_notification({
            "type": "esp32_event",
            "data": {
                "device_id": device_id,
                "event": "lid_closing",
                "action_id": action_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        })

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

        logger.info("ESP32 %s: Lid sequence completed with hardware events: %s", device_id, events)

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

        # Get device IP address from connections
        device_info = esp32_connections.get(device_id)
        if not device_info:
            logger.error("ESP32 device %s not registered", device_id)
            raise Exception(f"ESP32 device {device_id} not found or not registered")

        device_ip = device_info.get("ip_address")

        # Try direct IP communication first (if IP is available)
        if device_ip:
            logger.info("ESP32 %s found at IP: %s - attempting direct communication", device_id, device_ip)
            iot_client = SmartBinClient(esp32_ip=device_ip)
            events = await iot_client.close_bin(device_id=device_id)

            # Check if direct communication succeeded
            if any(event.get("event") == "lid_closed" and event.get("status") == "success" for event in events):
                logger.info("Direct IP communication successful for %s", device_id)
            else:
                logger.warning("Direct IP communication failed for %s, falling back to command queuing", device_id)
                # Fall back to command queuing
                await queue_command_for_esp32(device_id, "close", 0)
                events = [{"event": "command_queued", "status": "success"}]
        else:
            # No IP available, use command queuing
            logger.info("No IP address available for %s, using command queuing", device_id)
            await queue_command_for_esp32(device_id, "close", 0)
            events = [{"event": "command_queued", "status": "success"}]

        # Check if there were any errors
        has_error = any(event.get("event") == "error" for event in events)

        if has_error:
            logger.error("ESP32 %s: Close command failed", device_id)
            await db["esp32_logs"].update_one(
                {"_id": ObjectId(action_id)},
                {"$set": {"status": "error", "error_message": "Hardware communication failed", "hardware_events": events}}
            )
        else:
            # Update as completed
            await db["esp32_logs"].update_one(
                {"_id": ObjectId(action_id)},
                {"$set": {"status": "completed", "hardware_events": events}}
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

        logger.info("ESP32 %s: Lid close sequence completed", device_id)

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
