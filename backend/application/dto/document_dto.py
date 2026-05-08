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
