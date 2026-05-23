"""
WebSocket Router for Real-time Updates (v2).

Handles real-time communication with the frontend for tracking
document processing progress.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
from logger import log_manager

router = APIRouter(prefix="/ws", tags=["Real-time Updates"])


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        """Initialize connection manager."""
        # Map job_id to list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        """
        Connect a new websocket client.

        Args:
            websocket: The websocket connection
            job_id: Document identifier to subscribe to
        """
        await websocket.accept()

        if job_id not in self.active_connections:
            self.active_connections[job_id] = []

        self.active_connections[job_id].append(websocket)

        await log_manager.log(
            f"WebSocket v2: Client connected to job {job_id} (Total: {len(self.active_connections[job_id])})",
            "backend",
        )

    def disconnect(self, websocket: WebSocket, job_id: str):
        """
        Disconnect a websocket client.

        Args:
            websocket: The websocket connection
            job_id: Document identifier
        """
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)

            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def broadcast(self, job_id: str, message: dict):
        """
        Broadcast a message to all clients subscribed to a job.

        Args:
            job_id: Document identifier
            message: Message dictionary to send
        """
        if job_id in self.active_connections:
            # Create disconnected list to cleanup
            dead_connections = []

            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)

            # Cleanup dead connections
            for dead in dead_connections:
                self.disconnect(dead, job_id)


# Global connection manager instance for v2 API
connection_manager = ConnectionManager()


@router.websocket("/progress/{job_id}")
async def progress_websocket(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time progress updates.

    Args:
        websocket: The websocket connection
        job_id: Document identifier to track
    """
    await connection_manager.connect(websocket, job_id)

    try:
        while True:
            # Keep connection alive and handle client messages if needed
            # For now we just listen for disconnect
            data = await websocket.receive_text()

            # Optional: Handle client commands (pause, resume, etc.)
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, job_id)
        await log_manager.log(
            f"WebSocket v2: Client disconnected from job {job_id}", "backend"
        )
    except Exception as e:
        connection_manager.disconnect(websocket, job_id)
        await log_manager.log(f"WebSocket v2 Error on job {job_id}: {e}", "backend")
