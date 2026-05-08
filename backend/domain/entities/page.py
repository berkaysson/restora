from dataclasses import dataclass
from typing import Optional
from domain.value_objects.document_status import DocumentStatus
from domain.value_objects.ocr_result import OCRResult, LayoutData

@dataclass
class Page:
    """Bir dokümana ait tek bir sayfayı temsil eden Entity."""
    document_id: str
    page_number: int
    status: DocumentStatus = DocumentStatus.PENDING
    image_path: Optional[str] = None
    ocr_result: Optional[OCRResult] = None
    layout_data: Optional[LayoutData] = None
    error_message: Optional[str] = None

    def mark_as_processing(self) -> None:
        self.status = DocumentStatus.PROCESSING

    def mark_as_completed(self, image_path: str, ocr_result: OCRResult, layout_data: LayoutData) -> None:
        self.status = DocumentStatus.COMPLETED
        self.image_path = image_path
        self.ocr_result = ocr_result
        self.layout_data = layout_data
        self.error_message = None

    def mark_as_failed(self, error_message: str) -> None:
        self.status = DocumentStatus.FAILED
        self.error_message = error_message
