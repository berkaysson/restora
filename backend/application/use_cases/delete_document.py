from domain.interfaces import IDocumentRepository, IFileStorage
from logger import log_manager

class DeleteDocumentUseCase:
    """Bir dokümanı ve ona ait tüm dosyaları siler."""

    def __init__(self, repository: IDocumentRepository, storage: IFileStorage):
        self.repository = repository
        self.storage = storage

    async def execute(self, job_id: str) -> bool:
        try:
            # 1. Önce fiziksel dosyaları sil
            self.storage.delete_job_directory(job_id)
            
            # 2. Veritabanı kaydını sil
            self.repository.delete(job_id)
            
            await log_manager.log(f"Document and files deleted: {job_id}", "backend")
            return True
        except Exception as e:
            await log_manager.log(f"Delete Error for {job_id}: {str(e)}", "backend")
            return False
