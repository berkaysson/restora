from domain.interfaces import ILogger
from logger import log_manager

class WebSocketLogger(ILogger):
    """Bridges domain ILogger calls directly into the log_manager WebSocket broadcaster."""

    async def log(self, message: str, source: str = "backend") -> None:
        """Broadcasts the log message to all active WebSocket clients via the existing log_manager."""
        await log_manager.log(message, source)
