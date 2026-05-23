from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from domain.value_objects.document_status import DocumentStatus

class OCRResultDTO(BaseModel):
    """OCR sonuçlarını taşıyan DTO."""
    text: str
    confidence: float
    processing_time: float

class LayoutDataDTO(BaseModel):
    """Sayfa düzeni bilgilerini taşıyan DTO."""
    width: int
    height: int
    blocks: List[Dict[str, Any]] = Field(default_factory=list)
    lines: List[Dict[str, Any]] = Field(default_factory=list)

class PageDTO(BaseModel):
    """Sayfa bilgilerini taşıyan DTO."""
    document_id: str
    page_number: int
    status: DocumentStatus
    image_path: Optional[str] = None
    ocr_result: Optional[OCRResultDTO] = None
    layout_data: Optional[LayoutDataDTO] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_page(cls, page) -> "PageDTO":
        """Domain Page entity'sini PageDTO'ya dönüştürür."""
        ocr_result_dto = None
        if page.ocr_result is not None:
            ocr_result_dto = OCRResultDTO(
                text=page.ocr_result.text,
                confidence=page.ocr_result.confidence,
                processing_time=page.ocr_result.processing_time,
            )

        layout_data_dto = None
        if page.layout_data is not None:
            layout_data_dto = LayoutDataDTO(
                width=page.layout_data.width,
                height=page.layout_data.height,
                blocks=page.layout_data.blocks,
                lines=page.layout_data.lines,
            )

        return cls(
            document_id=page.document_id,
            page_number=page.page_number,
            status=page.status,
            image_path=page.image_path,
            ocr_result=ocr_result_dto,
            layout_data=layout_data_dto,
            error_message=page.error_message,
        )

class DocumentDTO(BaseModel):
    """Doküman bilgilerini taşıyan DTO."""
    id: str
    filename: str
    total_pages: int
    file_path: str
    status: DocumentStatus
    processed_pages: int
    pages: List[PageDTO] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_document(cls, document) -> "DocumentDTO":
        """Domain Document entity'sini DocumentDTO'ya dönüştürür."""
        return cls(
            id=document.id,
            filename=document.filename,
            total_pages=document.total_pages,
            file_path=document.file_path,
            status=document.status,
            processed_pages=document.processed_pages,
            pages=[PageDTO.from_page(p) for p in document.pages],
            created_at=document.created_at,
            updated_at=document.updated_at,
        )
