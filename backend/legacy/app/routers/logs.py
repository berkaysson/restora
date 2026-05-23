"""
Logs WebSocket Router.

Provides real-time log streaming to frontend clients via WebSocket.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from logger import log_manager

router = APIRouter()


@router.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time log streaming.

    Accepts WebSocket connections and keeps them alive to receive
    log messages broadcast by the LogManager. Frontend clients
    connect here to display live processing updates.

    Args:
        websocket: The WebSocket connection from the client.

    Note:
        Connection stays open until client disconnects.
        All log messages are broadcast in JSON format with
        timestamp, message, and source fields.
    """
    await log_manager.connect(websocket)
    try:
        while True:
            # Keep alive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        log_manager.disconnect(websocket)
