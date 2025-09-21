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
            # You may parse status updates here; for now, log.
            logger.debug("From %s: %s", device_id, msg)
    except WebSocketDisconnect:
        logger.info("ESP32 device disconnected: %s", device_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("WS error for %s: %s", device_id, e)
    finally:
        # Cleanup
        if clients.get(device_id) is websocket:
            clients.pop(device_id, None)


# Primary route under /esp32/ws
@router.websocket("/esp32/ws/{device_id}")
async def esp32_device_ws(websocket: WebSocket, device_id: str):
    await _device_ws_handler(websocket, device_id)


# Alias to match firmware default /ws/{device_id}
@router.websocket("/ws/{device_id}")
async def esp32_device_ws_alias(websocket: WebSocket, device_id: str):
    await _device_ws_handler(websocket, device_id)


@router.post("/api/esp32/control/{device_id}")
async def control_esp32_device(device_id: str, request: Request):
    """HTTP endpoint to push a command to a connected ESP32 via WebSocket.

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


@router.get("/api/esp32/devices")
async def list_connected_devices():
    """Return currently connected device IDs."""
    return {"connected_devices": list(clients.keys())}
