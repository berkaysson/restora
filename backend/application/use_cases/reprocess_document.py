import os
import json
from domain.entities.page import Page
from domain.interfaces import IDocumentRepository, IFileStorage, ITaskQueue
from domain.value_objects.document_status import DocumentStatus
from domain.value_objects.ocr_result import OCRResult, LayoutData
from domain.exceptions.business_exceptions import DocumentNotFoundException
from application.dto.document_dto import DocumentDTO
from logger import log_manager


class ReprocessDocumentUseCase:
    """
    Mevcut bir dokümanı yeniden işleme iş akışını yönetir.

    Eski `POST /process-existing/{job_id}` endpoint mantığının
    Clean Architecture versiyonu.

    Akış:
      1. Dokümanı Repository'den çek (bulunamazsa hata fırlat).
      2. Her sayfa için diskte OCR JSON dosyası var mı kontrol et:
         - Varsa → JSON'u okuyup DB'yi anında güncelle (Hızlı Yol, OCR çalışmaz).
         - Yoksa → Sayfayı ITaskQueue'ya ekle (OCR kuyruğu).
      3. Güncellenmiş entity'i kaydet.
      4. Sadece eksik sayfaları kuyruğa ekle.

    Desteklenen JSON formatları (geriye dönük uyumlu):
      - Eski: pages/page_001_ocr.json  (layout key'leri: layout_blocks, text_lines)
      - Yeni: pages/page_001_ocr.json  (layout key'leri: blocks, lines)
    """

    def __init__(
        self,
        repository: IDocumentRepository,
        storage: IFileStorage,
        task_queue: ITaskQueue,
    ):
        self.repository = repository
        self.storage = storage
        self.task_queue = task_queue

    async def execute(self, job_id: str) -> DocumentDTO:
        """
        Args:
            job_id: Yeniden işlenecek dokümanın ID'si.

        Returns:
            Güncellenen dokümanın DTO'su.

        Raises:
            DocumentNotFoundException: Doküman bulunamazsa.
            FileNotFoundError: Fiziksel dosya storage'da yoksa.
        """
        # 1. Dokümanı Repository'den çek
        document = self.repository.get_by_id(job_id)
        if not document:
            raise DocumentNotFoundException(job_id)

        await log_manager.log(
            f"ReprocessDocument: Starting reprocess for job {job_id} "
            f"({document.filename}, {document.total_pages} pages)",
            "backend",
        )

        # 2. Fiziksel dosyanın varlığını kontrol et
        if not os.path.exists(document.file_path):
            raise FileNotFoundError(
                f"Doküman dosyası storage'da bulunamadı: {document.file_path}"
            )

        # Job kök klasörü (file_path'in bulunduğu dizin)
        job_dir = os.path.dirname(document.file_path)

        # 3. Akıllı İşleme: Her sayfa için mevcut OCR JSON'unu kontrol et
        pages_to_enqueue = []
        document.processed_pages = 0  # Sayacı sıfırla, aşağıda yeniden hesaplanacak

        for page in document.pages:
            # Eski ve yeni format yollarını dene
            # Yeni format (ProcessPageUseCase üretimi): pages/page_001_ocr.json
            new_ocr_path = os.path.join(job_dir, "pages", f"page_{page.page_number:03d}_ocr.json")
            # Eski format (orijinal storage_manager üretimi): pages/page_001_ocr.json
            # (İkisi aynı konumda; eski sistem de aynı yapıyı kullanıyor)
            # Ek olarak "results_page_N.json" formatını da dene (geçiş dönemi kaydı)
            legacy_flat_path = os.path.join(job_dir, f"results_page_{page.page_number}.json")

            found_json = None
            if os.path.exists(new_ocr_path):
                found_json = new_ocr_path
            elif os.path.exists(legacy_flat_path):
                found_json = legacy_flat_path

            if found_json:
                try:
                    ocr_result, layout_data = self._load_ocr_json(found_json)

                    # Resim dosyası yolunu bul (pages/page_001.png)
                    img_path = os.path.join(job_dir, "pages", f"page_{page.page_number:03d}.png")
                    final_img_path = f"uploads/{job_id}/pages/page_{page.page_number:03d}.png" if os.path.exists(img_path) else ""

                    page.mark_as_completed(final_img_path, ocr_result, layout_data)
                    document.processed_pages += 1

                    await log_manager.log(
                        f"Reprocess: Page {page.page_number} recovered from {os.path.basename(found_json)}.",
                        "backend",
                    )
                except Exception as e:
                    await log_manager.log(
                        f"Reprocess: Failed to recover page {page.page_number} from JSON: {e}",
                        "backend",
                    )
                    page.status = DocumentStatus.PENDING
                    page.ocr_result = None
                    page.layout_data = None
                    page.image_path = None
                    page.error_message = None
                    pages_to_enqueue.append(page)
            else:
                # OCR dosyası yok — sayfayı sıfırla ve kuyruğa ekle
                page.status = DocumentStatus.PENDING
                page.ocr_result = None
                page.layout_data = None
                page.image_path = None
                page.error_message = None
                pages_to_enqueue.append(page)

        # 4. Doküman durumunu güncelle
        if document.processed_pages >= document.total_pages:
            document.mark_as_completed()
            await log_manager.log(
                f"Reprocess: Job {job_id} fully recovered from existing files. No OCR needed.",
                "backend",
            )
        else:
            document.status = DocumentStatus.PROCESSING
            await log_manager.log(
                f"Reprocess: Job {job_id} — {document.processed_pages} recovered, "
                f"{len(pages_to_enqueue)} pages will be OCR'd.",
                "backend",
            )

        # Kaydet
        self.repository.save(document)

        # 5. Sadece eksik sayfaları kuyruğa ekle
        for page in pages_to_enqueue:
            await self.task_queue.enqueue_page(job_id, page.page_number, document.file_path)

        return DocumentDTO.from_document(document)

    def _load_ocr_json(self, json_path: str):
        """
        OCR JSON dosyasını okuyup (OCRResult, LayoutData) döner.
        Hem eski (layout_blocks / text_lines) hem yeni (blocks / lines) key'leri destekler.
        """
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        ocr_result = OCRResult(
            text=data.get("text", ""),
            confidence=data.get("confidence", 0.0),
            processing_time=data.get("processing_time", 0.0),
        )

        layout_raw = data.get("layout", {})
        layout_data = LayoutData(
            width=layout_raw.get("width", 0),
            height=layout_raw.get("height", 0),
            # Hem eski (layout_blocks) hem yeni (blocks) key'ini destekle
            blocks=layout_raw.get("blocks", layout_raw.get("layout_blocks", [])),
            # Hem eski (text_lines) hem yeni (lines) key'ini destekle
            lines=layout_raw.get("lines", layout_raw.get("text_lines", [])),
        )

        return ocr_result, layout_data
