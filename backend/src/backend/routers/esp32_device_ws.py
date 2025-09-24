from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Dict
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["esp32-device-ws"])

# In-memory connection registry: device_id -> WebSocket
clients: Dict[str, WebSocket] = {}


async def _device_ws_handler(websocket: WebSocket, device_id: str):
    """WebSocket endpoint for ESP32 devices.

    Path chosen as /esp32/ws/{device_id} to avoid collision with existing /ws/* routes.
    """
    await websocket.accept()
    clients[device_id] = websocket
    logger.info("ESP32 device connected: %s", device_id)
    try:
        # Optional: initial hello exchange
        await websocket.send_text(json.dumps({
            "type": "connection_status",
            "status": "connected",
            "device_id": device_id,
        }))

        while True:
            # Keep connection alive and allow receiving messages from device
            msg = await websocket.receive_text()
            logger.debug("From %s: %s", device_id, msg)

            # Parse and handle deposit events sent by ESP32 firmware
            try:
                data = json.loads(msg)
                if data.get("type") == "deposit_event":
                    event_type = data.get("event")
                    if event_type in ("detected", "timeout"):
                        await handle_deposit_event(device_id, event_type)
                        continue
            except (json.JSONDecodeError, AttributeError) as e:
                logger.debug("Ignoring non-JSON or invalid message from %s: %s", device_id, e)
    except WebSocketDisconnect:
        logger.info("ESP32 device disconnected: %s", device_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("WS error for %s: %s", device_id, e)
    finally:
        # Cleanup
        if clients.get(device_id) is websocket:
            clients.pop(device_id, None)


async def handle_deposit_event(device_id: str, event_type: str):
    """Handle deposit detection events from ESP32 devices.

    Updates the most recent pending scan for the device with the given status
    and broadcasts a notification to frontend clients.
    """
    try:
        # Lazy imports to avoid circular dependencies at module import time
        from ..db.mongo import ensure_connection  # type: ignore
        from ..services.ws_manager import manager  # type: ignore

        db = await ensure_connection()

        # Find the most recent pending scan for this device
        scan = await db["scans"].find_one(
            {"device_id": device_id, "deposit_status": "pending"},
            sort=[("timestamp", -1)]
        )

        if not scan:
            logger.warning("No pending scan found for device %s to update with %s", device_id, event_type)
            return

        # Update scan with the deposit event outcome
        result = await db["scans"].update_one(
            {"_id": scan["_id"]},
            {"$set": {"deposit_status": event_type}}
        )

        if result.modified_count > 0:
            logger.info("Updated scan %s with deposit status: %s", scan["_id"], event_type)
            await manager.broadcast_notification({
                "type": "deposit_event",
                "data": {
                    "scan_id": str(scan["_id"]),
                    "device_id": device_id,
                    "event": event_type,
                    "user_email": scan.get("user_email"),
                },
            })
        else:
            logger.error("Failed to update scan %s with deposit status", scan["_id"])
    except Exception as e:  # noqa: BLE001
        logger.exception("Error handling deposit event from %s: %s", device_id, e)


# Primary route under /esp32/ws
@router.websocket("/esp32/ws/{device_id}")
async def esp32_device_ws(websocket: WebSocket, device_id: str):
    await _device_ws_handler(websocket, device_id)


# Alias to match firmware default /ws/{device_id}
@router.websocket("/ws/{device_id}")
async def esp32_device_ws_alias(websocket: WebSocket, device_id: str):
    await _device_ws_handler(websocket, device_id)


@router.post("/api/esp32/ws-control/{device_id}")
async def control_esp32_device_websocket(device_id: str, request: Request):
    """HTTP endpoint to push a command to a connected ESP32 via WebSocket.
    
    This endpoint complements the main ESP32 control endpoint by providing
    real-time WebSocket-based communication for devices that support it.

    Expected JSON body:
      {"action":"open|close", "duration_seconds": 3}
    Also accepts simulator-form {"cmd":"open|close"} and normalizes it.
    """
    if device_id not in clients:
        raise HTTPException(status_code=404, detail="Device not connected")

    payload = await request.json()

    # Normalize payload
    action = payload.get("action")
    cmd = payload.get("cmd")
    duration = payload.get("duration_seconds", 3)
    if not action and cmd in {"open", "close"}:
        action = cmd

    if action not in {"open", "close"}:
        raise HTTPException(status_code=400, detail="Invalid action; expected 'open' or 'close'")

    message = json.dumps({"action": action, "duration_seconds": duration})

    try:
        await clients[device_id].send_text(message)
        return JSONResponse({"status": "sent", "device_id": device_id})
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to send command to %s: %s", device_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/esp32/ws-devices")
async def list_connected_websocket_devices():
    """Return currently connected device IDs via WebSocket.
    
    This endpoint shows devices connected via WebSocket, complementing
    the main device list endpoint that shows all registered devices.
    """
    return {"connected_websocket_devices": list(clients.keys())}


@router.post("/api/esp32/deposit-event")
async def handle_deposit_event_http(request: Request):
    """HTTP fallback endpoint for deposit events when WebSocket is unavailable.

    Expected JSON body:
      {"device_id": "ESP32-SPARTANS", "event": "detected|timeout"}
    """
    try:
        data = await request.json()
        device_id = data.get("device_id", "ESP32-SPARTANS")
        event_type = data.get("event")
        if event_type not in ("detected", "timeout"):
            raise HTTPException(status_code=400, detail="Invalid event type; expected 'detected' or 'timeout'")
        await handle_deposit_event(device_id, event_type)
        return JSONResponse({"status": "ok", "device_id": device_id, "event": event_type})
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.exception("HTTP deposit event error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
