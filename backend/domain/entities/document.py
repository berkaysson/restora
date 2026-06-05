from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from domain.value_objects.document_status import DocumentStatus
from domain.entities.page import Page

@dataclass
class Document:
    """OCR sistemindeki ana dokümanı temsil eden Entity (Aggregate Root)."""
    id: str  # Job ID
    filename: str
    total_pages: int
    file_path: str
    status: DocumentStatus = DocumentStatus.PENDING
    processed_pages: int = 0
    pages: List[Page] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def mark_as_processing(self) -> None:
        self.status = DocumentStatus.PROCESSING
        self.updated_at = datetime.now()

    def mark_as_completed(self) -> None:
        self.status = DocumentStatus.COMPLETED
        self.updated_at = datetime.now()

    def mark_as_failed(self) -> None:
        self.status = DocumentStatus.FAILED
        self.updated_at = datetime.now()

    def mark_as_cancelled(self) -> None:
        self.status = DocumentStatus.CANCELLED
        self.updated_at = datetime.now()

    def is_fully_processed(self) -> bool:
        return self.processed_pages == self.total_pages and self.status == DocumentStatus.COMPLETED
