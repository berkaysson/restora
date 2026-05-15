from domain.interfaces import INotificationService
from app.routers.websocket import connection_manager

class WebSocketNotificationService(INotificationService):
    """
    WebSocket üzerinden gerçek zamanlı bildirim gönderen servis.
    Clean Architecture 'Infrastructure' katmanında yer alır.
    """

    async def broadcast(self, job_id: str, data: dict) -> None:
        """
        Mevcut ConnectionManager'ı kullanarak mesajı ilgili odadaki (job_id)
        tüm istemcilere yayınlar.
        """
        await connection_manager.broadcast(job_id, data)
