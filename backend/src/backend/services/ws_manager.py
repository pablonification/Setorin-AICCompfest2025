from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time notifications."""
    
    def __init__(self):
        # Map user_id to set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Map WebSocket to user_id for cleanup
        self.connection_users: Dict[WebSocket, str] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a new WebSocket client."""
        # Note: websocket.accept() is already called in the router
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.connection_users[websocket] = user_id
        
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections)}")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection_established",
            "message": "Connected to notification service",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client."""
        user_id = self.connection_users.get(websocket)
        if user_id:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            del self.connection_users[websocket]
            logger.info(f"User {user_id} disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket client."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message to WebSocket: {e}")
            # Mark for cleanup
            self.disconnect(websocket)
    
    async def send_notification_to_user(self, user_id: str, notification: dict):
        """Send a notification to a specific user's connections."""
        if user_id not in self.active_connections:
            return
        
        message = {
            "type": "notification",
            "data": notification,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to all connections of the user
        connections_to_remove = set()
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send notification to user {user_id}: {e}")
                connections_to_remove.add(websocket)
        
        # Clean up failed connections
        for websocket in connections_to_remove:
            self.disconnect(websocket)
    
    async def broadcast_notification(self, notification: dict, exclude_user: Optional[str] = None):
        """Broadcast a notification to all connected users."""
        message = {
            "type": "broadcast_notification",
            "data": notification,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        connections_to_remove = set()
        
        for user_id, connections in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue
                
            for websocket in connections:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to broadcast to user {user_id}: {e}")
                    connections_to_remove.add(websocket)
        
        # Clean up failed connections
        for websocket in connections_to_remove:
            self.disconnect(websocket)
    
    async def send_system_message(self, message: str, priority: str = "info"):
        """Send a system message to all connected users."""
        system_message = {
            "type": "system_message",
            "data": {
                "message": message,
                "priority": priority
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast_notification(system_message)
    
    async def send_bin_status_update(self, bin_id: str, status: str, location: str):
        """Send bin status update to all users."""
        bin_message = {
            "type": "bin_status_update",
            "data": {
                "bin_id": bin_id,
                "status": status,
                "location": location,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await self.broadcast_notification(bin_message)
    
    async def send_achievement_notification(self, user_id: str, achievement: dict):
        """Send achievement notification to a specific user."""
        achievement_message = {
            "type": "achievement",
            "data": achievement,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.send_notification_to_user(user_id, achievement_message)
    
    async def send_reward_notification(self, user_id: str, reward: dict):
        """Send reward notification to a specific user."""
        reward_message = {
            "type": "reward",
            "data": reward,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.send_notification_to_user(user_id, reward_message)
    
    async def send_leaderboard_update(self, user_id: str, rank: int, total_users: int):
        """Send leaderboard update notification to a specific user."""
        leaderboard_message = {
            "type": "leaderboard_update",
            "data": {
                "rank": rank,
                "total_users": total_users,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await self.send_notification_to_user(user_id, leaderboard_message)
    
    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return sum(len(connections) for connections in self.active_connections.values())
    
    def get_user_count(self) -> int:
        """Get total number of connected users."""
        return len(self.active_connections)
    
    def get_user_connections(self, user_id: str) -> Set[WebSocket]:
        """Get all connections for a specific user."""
        return self.active_connections.get(user_id, set())

    def get_connection_info(self) -> Dict[str, Any]:
        """Get connection information for health checks."""
        return {
            'total_connections': self.get_connection_count(),
            'total_users': self.get_user_count(),
            'connections': {
                user_id: len(connections)
                for user_id, connections in self.active_connections.items()
            }
        }
    
    async def ping_all_connections(self):
        """Send ping to all connections to keep them alive."""
        ping_message = {
            "type": "ping",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        connections_to_remove = set()
        
        for user_id, connections in self.active_connections.items():
            for websocket in connections:
                try:
                    await websocket.send_text(json.dumps(ping_message))
                except Exception as e:
                    logger.error(f"Failed to ping user {user_id}: {e}")
                    connections_to_remove.add(websocket)
        
        # Clean up failed connections
        for websocket in connections_to_remove:
            self.disconnect(websocket)
    
    async def start_ping_loop(self):
        """Start a background loop to ping connections every 30 seconds."""
        while True:
            try:
                await asyncio.sleep(30)
                await self.ping_all_connections()
            except Exception as e:
                logger.error(f"Error in ping loop: {e}")
                await asyncio.sleep(5)  # Wait before retrying


# Global connection manager instance
manager = ConnectionManager()


async def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager instance."""
    return manager


async def start_websocket_manager():
    """Start the WebSocket manager background tasks."""
    # Start ping loop in background
    asyncio.create_task(manager.start_ping_loop())
    logger.info("WebSocket manager started")


async def stop_websocket_manager():
    """Stop the WebSocket manager and close all connections."""
    # Close all connections
    for user_id, connections in manager.active_connections.items():
        for websocket in connections:
            try:
                await websocket.close()
            except Exception as e:
                logger.error(f"Error closing WebSocket for user {user_id}: {e}")
    
    # Clear all connections
    manager.active_connections.clear()
    manager.connection_users.clear()
    
    logger.info("WebSocket manager stopped")
