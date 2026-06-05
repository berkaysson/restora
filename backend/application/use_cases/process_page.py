import os
import time
import shutil
from typing import Optional
from domain.interfaces import IDocumentRepository, IFileStorage, IOCREngine, INotificationService
from infrastructure.storage.local_file_storage import LocalFileStorage
from logger import log_manager


class ProcessPageUseCase:
    """
    Tek bir sayfayı OCR ile işlemekten sorumlu Use Case.
    Kuyruktan gelen her sayfa için bu Use Case çalışır.
    Eski queue_manager.py içindeki process_page() metodunun Clean Architecture versiyonu.

    Performans Notu:
        Eski `repository.save(document)` çağrısı tüm sayfaları yeniden yazarak
        N+1 sorguya yol açıyordu. Bu Use Case artık targeted metodlar kullanır:
          - repository.save_page(page)              → 1 sorgu (sadece bu sayfa)
          - repository.update_document_progress()   → 1 sorgu (sadece sayaç)
        Toplamda sayfa başına max 2 sorgu — N büyüdükçe fark çok belirgin.

    Dosya yapısı (eski storage_manager.py ile uyumlu):
        uploads/{job_id}/pages/page_001.png          ← kalıcı sayfa resmi
        uploads/{job_id}/pages/page_001_ocr.json     ← OCR sonucu
    """

    def __init__(
        self,
        repository: IDocumentRepository,
        storage: IFileStorage,
        ocr_engine: IOCREngine,
        notification_service: Optional[INotificationService] = None
    ):
        self.repository = repository
        self.storage = storage
        self.ocr_engine = ocr_engine
        self.notification_service = notification_service

    async def execute(self, job_id: str, page_number: int, file_path: str) -> None:
        """
        Args:
            job_id: Doküman ID'si.
            page_number: İşlenecek sayfa numarası (1-indexed).
            file_path: Asıl PDF veya resim dosyasının yolu.
        """
        start_time = time.time()

        # Document'ı çek (sayfa listesi dahil)
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

            # 1. Sayfayı işlemde olarak işaretle — sadece bu sayfa güncellenir (1 sorgu)
            page.mark_as_processing()
            self.repository.save_page(page)

            # WebSocket Bildirimi: Başladı
            if self.notification_service:
                await self.notification_service.broadcast(job_id, {
                    "event": "page_started",
                    "page_number": page_number,
                    "total_pages": document.total_pages
                })

            # 2. PDF ise bu sayfayı resme çevir ve kalıcı konuma kaydet
            ext = os.path.splitext(file_path)[1].lower()
            if ext == ".pdf":
                from engine import preprocessor

                # Geçici konuma çıkart
                temp_image_path = await preprocessor.extract_pdf_page(file_path, page_number)

                # Kalıcı yolu belirle (eski storage_manager ile uyumlu: pages/page_001.png)
                if isinstance(self.storage, LocalFileStorage):
                    final_image_path = self.storage.get_page_image_path(job_id, page_number)
                else:
                    # Fallback: job dizini altına yaz
                    pages_dir = os.path.join(os.path.dirname(file_path), "pages")
                    os.makedirs(pages_dir, exist_ok=True)
                    final_image_path = os.path.join(pages_dir, f"page_{page_number:03d}.png")

                shutil.move(temp_image_path, final_image_path)
                page_image_path = final_image_path
            else:
                # Resim dosyası ise doğrudan kullan
                page_image_path = file_path

            # 3. OCR Motorunu çağır
            processed_image_path, ocr_result, layout_data = await self.ocr_engine.process_page(
                page_image_path
            )

            # 4. OCR Motoru yeni (işlenmiş/temizlenmiş) bir resim döndürdüyse onu kalıcı konuma taşı
            if processed_image_path and processed_image_path != page_image_path:
                if os.path.exists(processed_image_path):
                    shutil.copy2(processed_image_path, page_image_path)
                    try: os.remove(processed_image_path)
                    except: pass

            # 5. Sonuçları JSON olarak kaydet (pages/page_001_ocr.json)
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
                    "lines": layout_data.lines,
                },
            }
            # OCR JSON'unu pages/ alt klasörüne kaydet (eski yapı ile uyumlu)
            self.storage.save_json(job_id, f"pages/page_{page_number:03d}_ocr.json", result_data)

            # 6. Sayfa Entity'sini güncelle
            # DB'de mutlak yol değil, frontend'in kullanabileceği relative URL yolu sakla
            # Frontend: ${BASE_URL}/${image_path} → http://localhost:8000/uploads/job/pages/page_001.png
            relative_image_path = f"uploads/{job_id}/pages/page_{page_number:03d}.png"

            page.mark_as_completed(relative_image_path, ocr_result, layout_data)
            document.processed_pages += 1

            # 7. Doküman tamamlandı mı kontrol et
            if document.processed_pages >= document.total_pages:
                document.mark_as_completed()
                await log_manager.log(f"ProcessPage: Job {job_id} fully completed!", "backend")

            # Sadece değişen 2 şeyi yaz: 1 sayfa + document sayacı (2 sorgu)
            self.repository.save_page(page)
            self.repository.update_document_progress(
                job_id, document.processed_pages, document.status
            )

            # WebSocket Bildirimi: Tamamlandı
            if self.notification_service:
                await self.notification_service.broadcast(job_id, {
                    "event": "page_completed",
                    "page_number": page_number,
                    "processed_pages": document.processed_pages,
                    "total_pages": document.total_pages,
                    "status": document.status.value
                })

            await log_manager.log(
                f"ProcessPage: Page {page_number} completed in {processing_time:.2f}s", "backend"
            )

        except Exception as e:
            await log_manager.log(
                f"ProcessPage Error: Page {page_number} of job {job_id} failed: {e}", "backend"
            )
            page.mark_as_failed(str(e))
            # Hata durumunda da sadece bu sayfayı güncelle (1 sorgu)
            self.repository.save_page(page)

            # WebSocket Bildirimi: Hata
            if self.notification_service:
                await self.notification_service.broadcast(job_id, {
                    "event": "page_failed",
                    "page_number": page_number,
                    "error": str(e)
                })
