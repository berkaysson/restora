import time
import shutil
from domain.interfaces import IDocumentRepository, IFileStorage, IOCREngine
from logger import log_manager

class ProcessPageUseCase:
    """
    Tek bir sayfayı OCR ile işlemekten sorumlu Use Case.
    Kuyruktan gelen her sayfa için bu Use Case çalışır.
    Eski queue_manager.py içindeki process_page() metodunun Clean Architecture versiyonu.
    """

    def __init__(
        self,
        repository: IDocumentRepository,
        storage: IFileStorage,
        ocr_engine: IOCREngine
    ):
        self.repository = repository
        self.storage = storage
        self.ocr_engine = ocr_engine

    async def execute(self, job_id: str, page_number: int, file_path: str) -> None:
        """
        Args:
            job_id: Doküman ID'si.
            page_number: İşlenecek sayfa numarası (1-indexed).
            file_path: Asıl PDF veya resim dosyasının yolu.
        """
        start_time = time.time()
        document = self.repository.get_by_id(job_id)
        if not document:
            await log_manager.log(f"ProcessPage Error: Document {job_id} not found", "backend")
            return

        # İlgili sayfa entity'sini bul
        page = next((p for p in document.pages if p.page_number == page_number), None)
        if not page:
            await log_manager.log(
                f"ProcessPage Error: Page {page_number} not found in document {job_id}", "backend"
            )
            return

        try:
            await log_manager.log(
                f"ProcessPage: Starting page {page_number}/{document.total_pages} of job {job_id}",
                "backend"
            )

            # 1. Sayfayı işlemde olarak işaretle
            page.mark_as_processing()
            self.repository.save(document)

            # 2. PDF ise bu sayfayı resme çevir ve geçici konuma kaydet
            import os
            ext = os.path.splitext(file_path)[1].lower()
            if ext == ".pdf":
                from engine import preprocessor
                page_image_path = await preprocessor.extract_pdf_page(file_path, page_number)
            else:
                # Resim dosyası ise doğrudan kullan
                page_image_path = file_path

            # 3. OCR Motorunu çağır
            processed_image_path, ocr_result, layout_data = await self.ocr_engine.process_page(
                page_image_path
            )

            # 4. Sonuçları JSON olarak kaydet
            processing_time = time.time() - start_time
            result_data = {
                "job_id": job_id,
                "page_number": page_number,
                "text": ocr_result.text,
                "confidence": ocr_result.confidence,
                "processing_time": processing_time,
                "layout": {
                    "width": layout_data.width,
                    "height": layout_data.height,
                    "blocks": layout_data.blocks,
                    "lines": layout_data.lines
                }
            }
            self.storage.save_json(job_id, f"results_page_{page_number}.json", result_data)

            # 5. Sayfa Entity'sini güncelle
            page.mark_as_completed(processed_image_path, ocr_result, layout_data)
            document.processed_pages += 1

            # 6. Doküman tamamlandı mı kontrol et
            if document.processed_pages >= document.total_pages:
                document.mark_as_completed()
                await log_manager.log(f"ProcessPage: Job {job_id} fully completed!", "backend")

            self.repository.save(document)
            await log_manager.log(
                f"ProcessPage: Page {page_number} completed in {processing_time:.2f}s", "backend"
            )

        except Exception as e:
            await log_manager.log(
                f"ProcessPage Error: Page {page_number} of job {job_id} failed: {e}", "backend"
            )
            page.mark_as_failed(str(e))
            self.repository.save(document)
