"""
Database helper functions for multi-page document processing.

Provides CRUD operations for documents and pages tables.
"""

import sqlite3
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from database import get_db_connection


# ========== Document Operations ==========


def create_document(
    job_id: str, filename: str, total_pages: int, file_path: str
) -> None:
    """
    Create a new document record.

    Args:
        job_id: Unique document identifier (UUID)
        filename: Original filename
        total_pages: Total number of pages in document
        file_path: Path to stored PDF file
    """
    conn = get_db_connection()
    conn.execute(
        """INSERT INTO documents 
           (id, filename, total_pages, file_path, status)
           VALUES (?, ?, ?, ?, 'pending')""",
        (job_id, filename, total_pages, file_path),
    )
    conn.commit()
    conn.close()


def update_document_status(
    job_id: str, status: str, processed_pages: Optional[int] = None
) -> None:
    """
    Update document processing status.

    Args:
        job_id: Document identifier
        status: New status ('pending', 'processing', 'completed', 'failed', 'cancelled')
        processed_pages: Number of successfully processed pages (optional)
    """
    conn = get_db_connection()

    if processed_pages is not None:
        conn.execute(
            """UPDATE documents 
               SET status = ?, processed_pages = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (status, processed_pages, job_id),
        )
    else:
        conn.execute(
            """UPDATE documents 
               SET status = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (status, job_id),
        )

    conn.commit()
    conn.close()


def get_document(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve document information.

    Args:
        job_id: Document identifier

    Returns:
        Dictionary with document data or None if not found
    """
    conn = get_db_connection()
    cursor = conn.execute("SELECT * FROM documents WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def get_document_progress(job_id: str) -> Dict[str, Any]:
    """
    Get document processing progress.

    Args:
        job_id: Document identifier

    Returns:
        Dictionary with progress information:
            - total_pages: Total pages in document
            - processed_pages: Successfully processed pages
            - failed_pages: Failed pages
            - pending_pages: Not yet processed
            - progress_percentage: Completion percentage (0-100)
    """
    conn = get_db_connection()

    # Get document info
    doc = conn.execute(
        "SELECT total_pages, processed_pages, status FROM documents WHERE id = ?",
        (job_id,),
    ).fetchone()

    if not doc:
        conn.close()
        return {}

    # Get page status counts
    status_counts = conn.execute(
        """SELECT status, COUNT(*) as count 
           FROM processed_pages 
           WHERE document_id = ? 
           GROUP BY status""",
        (job_id,),
    ).fetchall()

    conn.close()

    total = doc["total_pages"]
    completed = sum(
        row["count"] for row in status_counts if row["status"] == "completed"
    )
    failed = sum(row["count"] for row in status_counts if row["status"] == "failed")
    processing = sum(
        row["count"] for row in status_counts if row["status"] == "processing"
    )
    pending = total - completed - failed - processing

    progress = (completed / total * 100) if total > 0 else 0

    return {
        "job_id": job_id,
        "total_pages": total,
        "completed_pages": completed,
        "failed_pages": failed,
        "processing_pages": processing,
        "pending_pages": pending,
        "progress_percentage": round(progress, 2),
        "status": doc["status"],
    }


# ========== Page Operations ==========


def create_page_records(document_id: str, total_pages: int) -> None:
    """
    Create page records for all pages in a document.

    Args:
        document_id: Document identifier
        total_pages: Number of pages to create
    """
    conn = get_db_connection()

    pages_data = [(document_id, page_num) for page_num in range(1, total_pages + 1)]

    conn.executemany(
        """INSERT OR IGNORE INTO processed_pages 
           (document_id, page_number, status)
           VALUES (?, ?, 'pending')""",
        pages_data,
    )

    conn.commit()
    conn.close()


def update_page_status(
    document_id: str, page_number: int, status: str, error_message: Optional[str] = None
) -> None:
    """
    Update page processing status.

    Args:
        document_id: Document identifier
        page_number: Page number (1-indexed)
        status: New status ('pending', 'processing', 'completed', 'failed')
        error_message: Error message if status is 'failed'
    """
    conn = get_db_connection()

    conn.execute(
        """UPDATE processed_pages 
           SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
           WHERE document_id = ? AND page_number = ?""",
        (status, error_message, document_id, page_number),
    )

    conn.commit()
    conn.close()


def update_page_data(
    document_id: str,
    page_number: int,
    image_path: str,
    ocr_text: str,
    layout_json: str,
    confidence_score: float,
    processing_time: float,
) -> None:
    """
    Update page with OCR processing results.

    Args:
        document_id: Document identifier
        page_number: Page number (1-indexed)
        image_path: Path to page image
        ocr_text: Extracted text
        layout_json: Layout data as JSON string
        confidence_score: OCR confidence (0-1)
        processing_time: Processing time in seconds
    """
    conn = get_db_connection()

    conn.execute(
        """UPDATE processed_pages 
           SET image_path = ?, ocr_text = ?, layout_json = ?, 
               confidence_score = ?, processing_time = ?, 
               status = 'completed', updated_at = CURRENT_TIMESTAMP
           WHERE document_id = ? AND page_number = ?""",
        (
            image_path,
            ocr_text,
            layout_json,
            confidence_score,
            processing_time,
            document_id,
            page_number,
        ),
    )

    conn.commit()
    conn.close()


def get_page_data(document_id: str, page_number: int) -> Optional[Dict[str, Any]]:
    """
    Retrieve page data.

    Args:
        document_id: Document identifier
        page_number: Page number (1-indexed)

    Returns:
        Dictionary with page data or None if not found
    """
    conn = get_db_connection()
    cursor = conn.execute(
        """SELECT * FROM processed_pages 
           WHERE document_id = ? AND page_number = ?""",
        (document_id, page_number),
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def get_pages_by_status(document_id: str, status: str) -> List[Dict[str, Any]]:
    """
    Get all pages with a specific status.

    Args:
        document_id: Document identifier
        status: Status to filter by

    Returns:
        List of page dictionaries
    """
    conn = get_db_connection()
    cursor = conn.execute(
        """SELECT * FROM processed_pages 
           WHERE document_id = ? AND status = ?
           ORDER BY page_number""",
        (document_id, status),
    )
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_document_pages(
    document_id: str, page: int = 1, limit: int = 50
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Get paginated list of pages for a document.

    Args:
        document_id: Document identifier
        page: Page number for pagination (1-indexed)
        limit: Number of results per page

    Returns:
        Tuple of (page_list, total_count)
    """
    conn = get_db_connection()

    # Get total count
    total = conn.execute(
        "SELECT COUNT(*) as count FROM processed_pages WHERE document_id = ?",
        (document_id,),
    ).fetchone()["count"]

    # Get paginated results
    offset = (page - 1) * limit
    cursor = conn.execute(
        """SELECT * FROM processed_pages 
           WHERE document_id = ?
           ORDER BY page_number
           LIMIT ? OFFSET ?""",
        (document_id, limit, offset),
    )
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows], total


def delete_document(document_id: str) -> None:
    """
    Delete document and all associated pages.

    Args:
        document_id: Document identifier
    """
    conn = get_db_connection()

    # Delete pages (will cascade due to foreign key)
    conn.execute("DELETE FROM processed_pages WHERE document_id = ?", (document_id,))

    # Delete document
    conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))

    conn.commit()
    conn.close()
