"""
SQLite Database Management Module.

Handles database initialization and connection management for the
Restora application. Uses SQLite for simple, file-based storage.

Tables:
    - documents: Multi-page document metadata (job-level)
    - processed_pages: Individual page processing status and data
"""

import sqlite3

#: SQLite database filename
DB_NAME = "restora.db"


def init_db() -> None:
    """Initialize the SQLite database with required tables.

    Creates tables for multi-page document processing with granular
    page-level tracking.

    Tables created:
        - documents: Multi-page document metadata (job-level)
        - processed_pages: Individual page processing status and data
    """
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Documents table for multi-page PDFs
    c.execute(
        """CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_pages INTEGER NOT NULL,
            processed_pages INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            file_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )

    # Processed pages table with detailed tracking
    c.execute(
        """CREATE TABLE IF NOT EXISTS processed_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            image_path TEXT,
            ocr_text TEXT,
            layout_json TEXT,
            confidence_score REAL,
            processing_time REAL,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
            UNIQUE(document_id, page_number)
        )"""
    )

    # Create indexes for efficient queries
    c.execute(
        """CREATE INDEX IF NOT EXISTS idx_pages_document 
           ON processed_pages(document_id)"""
    )
    c.execute(
        """CREATE INDEX IF NOT EXISTS idx_pages_status 
           ON processed_pages(status)"""
    )
    c.execute(
        """CREATE INDEX IF NOT EXISTS idx_documents_status 
           ON documents(status)"""
    )

    conn.commit()
    conn.close()


def get_db_connection() -> sqlite3.Connection:
    """Create and return a new database connection.

    Returns a connection with row_factory set to sqlite3.Row,
    allowing dictionary-like access to query results.

    Returns:
        sqlite3.Connection configured for Row-based access.

    Example:
        >>> conn = get_db_connection()
        >>> cursor = conn.execute("SELECT * FROM documents")
        >>> for row in cursor:
        ...     print(row["filename"])
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn
