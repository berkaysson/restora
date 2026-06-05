from domain.interfaces import IDocumentRepository, ITaskQueue, INotificationService, IFileStorage
from domain.value_objects.document_status import DocumentStatus
from logger import log_manager


class CancelJobUseCase:
    """Devam eden bir OCR işlemini iptal etme iş akışını yönetir ve kayıtları temizler."""

    def __init__(
        self,
        repository: IDocumentRepository,
        task_queue: ITaskQueue,
        notification_service: INotificationService = None,
        storage: IFileStorage = None,
    ):
        self.repository = repository
        self.task_queue = task_queue
        self.notification_service = notification_service
        self.storage = storage

    async def execute(self, job_id: str) -> bool:
        try:
            # 1. Kuyruktaki işi iptal et (böylece worker'lar sonraki sayfaları atlar)
            await self.task_queue.cancel_job(job_id)

            # 2. WebSocket üzerinden iptal bildirimi gönder
            if self.notification_service:
                await self.notification_service.broadcast(
                    job_id,
                    {
                        "event": "job_cancelled",
                        "job_id": job_id,
                        "status": DocumentStatus.CANCELLED.value,
                    },
                )

            # 3. Fiziksel dosyaları sil
            if self.storage:
                try:
                    self.storage.delete_job_directory(job_id)
                except Exception as ex:
                    await log_manager.log(
                        f"CancelJob: Error deleting storage directory for {job_id}: {str(ex)}", "backend"
                    )

            # 4. Veritabanı kaydını sil
            self.repository.delete(job_id)

            await log_manager.log(
                f"CancelJob: Job {job_id} and all its files/records completely deleted", "backend"
            )
            return True
        except Exception as e:
            await log_manager.log(
                f"CancelJob Error for {job_id}: {str(e)}", "backend"
            )
            return False
