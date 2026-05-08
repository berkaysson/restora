import uuid
import os
from domain.entities.document import Document
from domain.entities.page import Page
from domain.interfaces import IDocumentRepository, IFileStorage
from application.dto.document_dto import DocumentDTO

class UploadDocumentUseCase:
    """Yeni bir doküman yükleme iş akışını yönetir."""

    def __init__(self, repository: IDocumentRepository, storage: IFileStorage):
        self.repository = repository
        self.storage = storage

    async def execute(self, filename: str, content: bytes) -> DocumentDTO:
        # C. Dosya tipi kontrolü
        allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg"]
        ext = os.path.splitext(filename)[1].lower()
        if ext not in allowed_extensions:
            raise ValueError(f"Desteklenmeyen dosya formatı: {ext}. Sadece PDF ve resim dosyaları kabul edilir.")

        # 1. Benzersiz bir Job ID oluştur
        job_id = str(uuid.uuid4())

        # 2. Dosyayı Infrastructure üzerinden kaydet
        file_path = self.storage.save_file(job_id, filename, content)

        # 3. Eski yapıya en yakın seçenek: Her zaman 1 sayfa olarak kabul et
        total_pages = 1

        # 4. Domain Entity oluştur
        document = Document(
            id=job_id,
            filename=filename,
            total_pages=total_pages,
            file_path=file_path
        )

        # 5. Sayfa Entity'lerini oluştur ve dökümana ekle
        for i in range(1, total_pages + 1):
            page = Page(
                document_id=job_id,
                page_number=i
            )
            document.pages.append(page)

        # 6. Repository üzerinden kalıcı hale getir
        self.repository.save(document)

        # 7. Sonucu DTO olarak dön
        # Pydantic v2 model_validate (eski from_orm) kullanıyoruz
        return DocumentDTO.model_validate(document)

    def _get_page_count(self, file_path: str) -> int:
        """Dosyanın sayfa sayısını belirler."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            try:
                import pypdfium2 as pdfium
                pdf = pdfium.PdfDocument(file_path)
                return len(pdf)
            except Exception:
                return 1 # Hata durumunda en az 1 sayfa varsay
        return 1 # Resim dosyaları için 1 sayfa
