from fastapi import WebSocket
from typing import List
import json
import datetime

class LogManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.log("New client connected", "system")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def log(self, message: str, source: str = "backend"):
        """
        Broadcast a log message to all connected clients.
        source: 'backend' | 'system' | 'frontend' (though frontend usually logs locally, we might echo back)
        """
        timestamp = datetime.datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "source": source
        }
        
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
