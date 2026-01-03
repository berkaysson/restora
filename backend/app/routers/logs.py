from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from logger import log_manager

router = APIRouter()


@router.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await log_manager.connect(websocket)
    try:
        while True:
            # Keep alive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        log_manager.disconnect(websocket)
