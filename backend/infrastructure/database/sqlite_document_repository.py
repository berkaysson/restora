import json
import sqlite3
from typing import List, Optional
from domain.entities.document import Document
from domain.interfaces import IDocumentRepository
from infrastructure.database.mappers import DatabaseMapper
from database import DB_NAME, get_db_connection

class SqliteDocumentRepository(IDocumentRepository):
    """SQLite kullanarak IDocumentRepository arayüzünü uygular."""

    def save(self, document: Document) -> None:
        conn = get_db_connection()
        try:
            with conn:
                # 1. Document tablosuna kaydet/güncelle
                conn.execute(
                    """INSERT INTO documents (id, filename, total_pages, processed_pages, status, file_path)
                       VALUES (?, ?, ?, ?, ?, ?)
                       ON CONFLICT(id) DO UPDATE SET
                       processed_pages = excluded.processed_pages,
                       status = excluded.status,
                       updated_at = CURRENT_TIMESTAMP""",
                    (document.id, document.filename, document.total_pages, 
                     document.processed_pages, document.status.value, document.file_path)
                )

                # 2. Page'leri kaydet/güncelle
                for page in document.pages:
                    layout_json = None
                    if page.layout_data:
                        layout_json = json.dumps({
                            "width": page.layout_data.width,
                            "height": page.layout_data.height,
                            "layout_blocks": page.layout_data.blocks,
                            "text_lines": page.layout_data.lines
                        }, ensure_ascii=False)

                    ocr_text = page.ocr_result.text if page.ocr_result else None
                    confidence = page.ocr_result.confidence if page.ocr_result else None
                    proc_time = page.ocr_result.processing_time if page.ocr_result else None

                    conn.execute(
                        """INSERT INTO processed_pages 
                           (document_id, page_number, status, image_path, ocr_text, layout_json, confidence_score, processing_time, error_message)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                           ON CONFLICT(document_id, page_number) DO UPDATE SET
                           status = excluded.status,
                           image_path = excluded.image_path,
                           ocr_text = excluded.ocr_text,
                           layout_json = excluded.layout_json,
                           confidence_score = excluded.confidence_score,
                           processing_time = excluded.processing_time,
                           error_message = excluded.error_message,
                           updated_at = CURRENT_TIMESTAMP""",
                        (page.document_id, page.page_number, page.status.value, page.image_path,
                         ocr_text, layout_json, confidence, proc_time, page.error_message)
                    )
        finally:
            conn.close()

    def get_by_id(self, job_id: str) -> Optional[Document]:
        conn = get_db_connection()
        try:
            doc_row = conn.execute("SELECT * FROM documents WHERE id = ?", (job_id,)).fetchone()
            if not doc_row:
                return None

            pages_rows = conn.execute(
                "SELECT * FROM processed_pages WHERE document_id = ? ORDER BY page_number", 
                (job_id,)
            ).fetchall()

            return DatabaseMapper.to_document_entity(doc_row, pages_rows)
        finally:
            conn.close()

    def list_all(self) -> List[Document]:
        conn = get_db_connection()
        try:
            rows = conn.execute("SELECT * FROM documents ORDER BY created_at DESC").fetchall()
            return [DatabaseMapper.to_document_entity(row) for row in rows]
        finally:
            conn.close()

    def delete(self, job_id: str) -> None:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute("DELETE FROM documents WHERE id = ?", (job_id,))
                # Foreign key ON DELETE CASCADE olduğu varsayılıyor, 
                # ama garantiye almak için manuel de silinebilir.
        finally:
            conn.close()
