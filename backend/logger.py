"""
Real-time Logging System.

This module provides a WebSocket-based logging manager that broadcasts
log messages to all connected frontend clients in real-time.

Usage:
    from logger import log_manager
    await log_manager.log("Processing started", "backend")
"""

from fastapi import WebSocket
from typing import List
import json
import datetime


class LogManager:
    """WebSocket-based log message broadcaster.

    Manages WebSocket connections and broadcasts log messages to all
    connected clients in real-time. Used for streaming backend events
    to the frontend log panel.

    Attributes:
        active_connections: List of currently connected WebSocket clients.

    Example:
        >>> await log_manager.connect(websocket)
        >>> await log_manager.log("File uploaded", "backend")
    """

    def __init__(self) -> None:
        """Initialize the LogManager with an empty connection list."""
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection and add to active list.

        Args:
            websocket: The WebSocket connection to accept.
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.log("New client connected", "system")

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection from the active list.

        Args:
            websocket: The WebSocket connection to remove.
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def log(self, message: str, source: str = "backend") -> None:
        """Broadcast a log message to all connected clients.

        Sends a JSON-formatted log entry to all active WebSocket connections.
        Automatically cleans up disconnected clients.

        Args:
            message: The log message content.
            source: Origin of the log. One of:
                - 'backend': Server-side processing events
                - 'system': Application lifecycle events
                - 'frontend': Echoed frontend logs (rare)
        """
        timestamp = datetime.datetime.now().isoformat()
        log_entry = {"timestamp": timestamp, "message": message, "source": source}

        # Broadcast to all
        # Note: In a real async app we might need to be careful about blocking,
        # but for this scale, iterating is fine.
        disconnected_clients = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(log_entry))
            except Exception:
                disconnected_clients.append(connection)

        # Cleanup broken connections
        for dead in disconnected_clients:
            self.disconnect(dead)


# Single instance
log_manager = LogManager()
