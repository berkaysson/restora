"""
Logs WebSocket Router (v2).

Provides real-time log streaming to frontend clients via WebSocket.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from logger import log_manager

router = APIRouter(prefix="/ws", tags=["Logs"])


@router.websocket("/logs")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time log streaming.

    Accepts WebSocket connections and keeps them alive to receive
    log messages broadcast by the LogManager. Frontend clients
    connect here to display live processing updates.

    Args:
        websocket: The WebSocket connection from the client.
    """
    await log_manager.connect(websocket)
    try:
        while True:
            # Keep alive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        log_manager.disconnect(websocket)
