import json
from domain.interfaces import IDocumentRepository, IFileStorage, IOCREngine
from domain.value_objects.document_status import DocumentStatus
from logger import log_manager

class ProcessDocumentUseCase:
    """Doküman işleme (OCR) iş akışını yönetir."""

    def __init__(
        self, 
        repository: IDocumentRepository, 
        storage: IFileStorage, 
        ocr_engine: IOCREngine
    ):
        self.repository = repository
        self.storage = storage
        self.ocr_engine = ocr_engine

    async def execute(self, job_id: str) -> None:
        # 1. Dokümanı Repository'den çek
        document = self.repository.get_by_id(job_id)
        if not document:
            await log_manager.log(f"Process Error: Document {job_id} not found", "backend")
            return

        try:
            await log_manager.log(f"Starting OCR processing for document: {document.filename} ({job_id})", "backend")
            
            # 2. Dokümanı işlemde olarak işaretle
            document.mark_as_processing()
            self.repository.save(document)

            # 3. Her bir sayfayı işle
            for page in document.pages:
                await log_manager.log(f"Processing page {page.page_number}/{document.total_pages}", "backend")
                
                page.mark_as_processing()
                self.repository.save(document)

                # 4. OCR Motorunu çağır
                try:
                    processed_img_path, ocr_result, layout_data = await self.ocr_engine.process_page(document.file_path)

                    # 5. Sonuçları JSON olarak kaydet
                    result_data = {
                        "job_id": job_id,
                        "page_number": page.page_number,
                        "text": ocr_result.text,
                        "confidence": ocr_result.confidence,
                        "processing_time": ocr_result.processing_time,
                        "layout": {
                            "width": layout_data.width,
                            "height": layout_data.height,
                            "blocks": layout_data.blocks,
                            "lines": layout_data.lines
                        }
                    }
                    
                    filename = f"results_page_{page.page_number}.json"
                    self.storage.save_json(job_id, filename, result_data)

                    # 6. Sayfa Entity'sini güncelle
                    page.mark_as_completed(processed_img_path, ocr_result, layout_data)
                    document.processed_pages += 1
                    
                    await log_manager.log(f"Page {page.page_number} completed successfully", "backend")
                
                except Exception as page_error:
                    await log_manager.log(f"Error processing page {page.page_number}: {page_error}", "backend")
                    page.mark_as_failed(str(page_error))
                
                # Her sayfa sonrası DB güncelle (progress takibi için)
                self.repository.save(document)

            # 7. Dokümanı tamamlandı olarak işaretle
            document.mark_as_completed()
            self.repository.save(document)
            await log_manager.log(f"Document processing completed: {job_id}", "backend")

        except Exception as e:
            await log_manager.log(f"Process Document Error: {str(e)}", "backend")
            document.mark_as_failed()
            self.repository.save(document)
            raise e
