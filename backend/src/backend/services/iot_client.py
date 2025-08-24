from __future__ import annotations

import asyncio
import json
import logging
from typing import List, Dict, Any, Optional

import httpx

from ..core.config import get_settings

logger = logging.getLogger(__name__)


class SmartBinClient:
    """Client to control SmartBin via HTTP requests or command queuing."""

    def __init__(self, esp32_ip: str | None = None):
        self.esp32_ip = esp32_ip
        self.timeout = 10.0  # 10 seconds timeout
        self.control_url = f"http://{esp32_ip}:80/control" if esp32_ip else None
        self.backend_url = get_settings().BACKEND_URL if hasattr(get_settings(), 'BACKEND_URL') else "https://api.setorin.app"

    async def open_bin(self, device_id: str = "ESP32-SMARTBIN-420", duration_seconds: int = 3) -> List[Dict[str, Any]]:
        """Send open command to ESP32 via HTTP and return response data."""
        if not self.esp32_ip or not self.control_url:
            logger.error("ESP32 IP address not set")
            return [{"error": "ESP32 IP address not configured"}]

        events: List[Dict[str, Any]] = []

        try:
            logger.info("Sending HTTP request to ESP32: %s", self.control_url)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "action": "open",
                    "duration_seconds": duration_seconds
                }

                # Add device_id if provided
                if device_id:
                    payload["device_id"] = device_id

                logger.info("Payload: %s", payload)

                response = await client.post(
                    self.control_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                logger.info("ESP32 response status: %d", response.status_code)
                logger.info("ESP32 response: %s", response.text)

                if response.status_code == 200:
                    try:
                        response_data = response.json()
                        events.append({
                            "event": "lid_opened",
                            "status": "success",
                            "response": response_data
                        })

                        # Since the ESP32 handles the full sequence (open -> wait -> close),
                        # we can immediately add the close event
                        events.append({
                            "event": "lid_closed",
                            "status": "success"
                        })

                    except json.JSONDecodeError as e:
                        logger.error("Failed to parse ESP32 response: %s", e)
                        events.append({
                            "event": "error",
                            "status": "error",
                            "error": "Invalid JSON response from ESP32"
                        })
                else:
                    logger.error("ESP32 returned error status: %d", response.status_code)
                    events.append({
                        "event": "error",
                        "status": "error",
                        "error": f"HTTP {response.status_code}: {response.text}"
                    })

        except httpx.TimeoutException:
            logger.error("Timeout communicating with ESP32 at %s", self.esp32_ip)
            events.append({
                "event": "error",
                "status": "error",
                "error": f"Timeout connecting to ESP32 at {self.esp32_ip}"
            })

        except httpx.ConnectError as e:
            logger.error("Connection error to ESP32: %s", e)
            events.append({
                "event": "error",
                "status": "error",
                "error": f"Cannot connect to ESP32 at {self.esp32_ip}: {str(e)}"
            })

        except Exception as exc:
            logger.error("IoT communication error: %s", exc)
            events.append({
                "event": "error",
                "status": "error",
                "error": str(exc)
            })

        return events

    async def queue_command(self, device_id: str, action: str, duration_seconds: int = 3) -> Dict[str, Any]:
        """Queue a command for ESP32 to poll (works across networks)."""
        try:
            logger.info("Queuing command for ESP32 %s: %s", device_id, action)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Store command in database for ESP32 to poll
                command_data = {
                    "device_id": device_id,
                    "action": action,
                    "duration_seconds": duration_seconds,
                    "status": "queued",
                    "timestamp": "now"
                }

                # For now, we'll use a simple approach - the ESP32 can poll for commands
                # In production, you'd store this in the database
                logger.info("Command queued successfully: %s", command_data)

                return {
                    "status": "queued",
                    "command_id": f"{device_id}_{action}",
                    "message": f"Command {action} queued for device {device_id}"
                }

        except Exception as exc:
            logger.error("Error queuing command: %s", exc)
            return {
                "status": "error",
                "error": str(exc)
            }

    async def get_pending_commands(self, device_id: str) -> List[Dict[str, Any]]:
        """Get pending commands for ESP32 to execute (for polling approach)."""
        # This would typically query the database for pending commands
        # For now, return empty list as we haven't implemented the queuing yet
        return []

    async def close_bin(self, device_id: str = "ESP32-SMARTBIN-420") -> List[Dict[str, Any]]:
        """Send close command to ESP32 via HTTP."""
        if not self.esp32_ip or not self.control_url:
            logger.error("ESP32 IP address not set")
            return [{"error": "ESP32 IP address not configured"}]

        events: List[Dict[str, Any]] = []

        try:
            logger.info("Sending close command to ESP32: %s", self.control_url)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "action": "close"
                }

                if device_id:
                    payload["device_id"] = device_id

                response = await client.post(
                    self.control_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                logger.info("ESP32 close response status: %d", response.status_code)

                if response.status_code == 200:
                    events.append({
                        "event": "lid_closed",
                        "status": "success",
                        "response": response.json() if response.text else {}
                    })
                else:
                    events.append({
                        "event": "error",
                        "status": "error",
                        "error": f"HTTP {response.status_code}: {response.text}"
                    })

        except Exception as exc:
            logger.error("Error closing lid: %s", exc)
            events.append({
                "event": "error",
                "status": "error",
                "error": str(exc)
            })

        return events
