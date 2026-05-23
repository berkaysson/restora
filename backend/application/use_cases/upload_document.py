import uuid
import os
from domain.entities.document import Document
from domain.entities.page import Page
from domain.interfaces import IDocumentRepository, IFileStorage, ITaskQueue
from application.dto.document_dto import DocumentDTO

class UploadDocumentUseCase:
    """Yeni bir doküman yükleme iş akışını yönetir."""

    def __init__(
        self,
        repository: IDocumentRepository,
        storage: IFileStorage,
        task_queue: ITaskQueue
    ):
        self.repository = repository
        self.storage = storage
        self.task_queue = task_queue

    async def execute(self, filename: str, content: bytes) -> DocumentDTO:
        # 1. Dosya tipi kontrolü
        allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg"]
        ext = os.path.splitext(filename)[1].lower()
        if ext not in allowed_extensions:
            raise ValueError(
                f"Desteklenmeyen dosya formatı: {ext}. Sadece PDF ve resim dosyaları kabul edilir."
            )

        # 2. Benzersiz bir Job ID oluştur
        job_id = str(uuid.uuid4())

        # 3. Dosyayı Infrastructure üzerinden kaydet
        file_path = self.storage.save_file(job_id, filename, content)

        # 4. Sayfa sayısını tespit et (PDF için gerçek sayfa sayısı, resim için 1)
        total_pages = self._get_page_count(file_path)

        # 5. Domain Entity'lerini oluştur (Doküman + Sayfalar)
        document = Document(
            id=job_id,
            filename=filename,
            total_pages=total_pages,
            file_path=file_path
        )
        for i in range(1, total_pages + 1):
            document.pages.append(Page(document_id=job_id, page_number=i))

        # 6. Veritabanına kaydet
        self.repository.save(document)

        # 7. Her sayfayı kuyruğa ekle (asenkron işleme başlatılır)
        for i in range(1, total_pages + 1):
            await self.task_queue.enqueue_page(job_id, i, file_path)

        return DocumentDTO.from_document(document)

    def _get_page_count(self, file_path: str) -> int:
        """Dosyanın sayfa sayısını belirler."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(file_path)
                count = len(pdf)
                pdf.close()
                return count
            except Exception:
                return 1
        return 1  # Resim dosyaları tek sayfadır
