import json
from sqlite3 import Row
from datetime import datetime
from domain.entities.document import Document
from domain.entities.page import Page
from domain.value_objects.document_status import DocumentStatus
from domain.value_objects.ocr_result import OCRResult, LayoutData

class DatabaseMapper:
    """Veritabanı satırları ile Domain Entity'leri arasında dönüşüm sağlar."""

    @staticmethod
    def to_page_entity(row: Row) -> Page:
        ocr_result = None
        if row["ocr_text"] is not None:
            ocr_result = OCRResult(
                text=row["ocr_text"],
                confidence=row["confidence_score"] or 0.0,
                processing_time=row["processing_time"] or 0.0
            )

        layout_data = None
        if row["layout_json"] is not None:
            try:
                data = json.loads(row["layout_json"])
                layout_data = LayoutData(
                    width=data.get("width", 0),
                    height=data.get("height", 0),
                    blocks=data.get("layout_blocks", []),
                    lines=data.get("text_lines", [])
                )
            except (json.JSONDecodeError, TypeError):
                pass

        return Page(
            document_id=row["document_id"],
            page_number=row["page_number"],
            status=DocumentStatus(row["status"]),
            image_path=row["image_path"],
            ocr_result=ocr_result,
            layout_data=layout_data,
            error_message=row["error_message"]
        )

    @staticmethod
    def to_document_entity(row: Row, pages_rows: list = None) -> Document:
        pages = []
        if pages_rows:
            pages = [DatabaseMapper.to_page_entity(p_row) for p_row in pages_rows]

        # SQLite timestamp format conversion (optional, depends on how it's stored)
        # Assuming standard TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        created_at = row["created_at"]
        if isinstance(created_at, str):
            try:
                # Handle standard SQLite format 'YYYY-MM-DD HH:MM:SS'
                created_at = datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                created_at = datetime.now()

        return Document(
            id=row["id"],
            filename=row["filename"],
            total_pages=row["total_pages"],
            file_path=row["file_path"],
            status=DocumentStatus(row["status"]),
            processed_pages=row["processed_pages"] or 0,
            pages=pages,
            created_at=created_at,
            updated_at=datetime.now() # Simplified for now
        )
