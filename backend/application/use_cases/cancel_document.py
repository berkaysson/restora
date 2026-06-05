from typing import Optional
from domain.interfaces import IDocumentRepository, IFileStorage, ITaskQueue, INotificationService
from domain.exceptions.business_exceptions import DocumentNotFoundException
from logger import log_manager

class CancelDocumentUseCase:
    """Aktif bir dokümanın işleme sürecini iptal eder ve dokümanı tamamen siler."""

    def __init__(
        self,
        repository: IDocumentRepository,
        storage: IFileStorage,
        task_queue: ITaskQueue,
        notification_service: Optional[INotificationService] = None
    ):
        self.repository = repository
        self.storage = storage
        self.task_queue = task_queue
        self.notification_service = notification_service

    async def execute(self, job_id: str) -> None:
        """
        Args:
            job_id: İptal edilip silinecek dokümanın ID'si.

        Raises:
            DocumentNotFoundException: Doküman bulunamazsa.
        """
        # 1. Dokümanı Repository'den çek
        document = self.repository.get_by_id(job_id)
        if not document:
            raise DocumentNotFoundException(job_id)

        await log_manager.log(
            f"CancelDocument: Starting cancel and delete process for job {job_id} ({document.filename})",
            "backend"
        )

        # 2. Kuyruk ve çalışan task'leri iptal et
        await self.task_queue.cancel_job(job_id)

        # 3. Fiziksel dosyaları sil
        try:
            self.storage.delete_job_directory(job_id)
            await log_manager.log(f"CancelDocument: Deleted job directory for {job_id}", "backend")
        except Exception as e:
            await log_manager.log(
                f"CancelDocument Warning: Failed to delete job directory for {job_id}: {e}",
                "backend"
            )

        # 4. Veritabanı kaydını sil
        self.repository.delete(job_id)
        await log_manager.log(f"CancelDocument: Deleted database record for {job_id}", "backend")

        # 5. WebSocket üzerinden bildirim gönder
        if self.notification_service:
            await self.notification_service.broadcast(job_id, {
                "event": "job_cancelled",
                "job_id": job_id,
                "status": "cancelled"
            })

        await log_manager.log(
            f"CancelDocument: Job {job_id} successfully cancelled and deleted",
            "backend"
        )
