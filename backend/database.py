"""
SQLite Database Management Module.

Handles database initialization and connection management for the
Restora application. Uses SQLite for simple, file-based storage.

Tables:
    - books: Stores book metadata (id, title, status)
    - pages: Stores page data (image path, OCR text, layout JSON)
"""

import sqlite3

#: SQLite database filename
DB_NAME = "restora.db"


def init_db() -> None:
    """Initialize the SQLite database with required tables.

    Creates the 'books' and 'pages' tables if they don't exist.
    Should be called once at application startup.

    Tables created:
        - books: id (PK), title, status
        - pages: id (PK), book_id (FK), page_num, image_path, raw_text, layout_json
    """
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Kitaplar tablosu
    c.execute(
        """CREATE TABLE IF NOT EXISTS books 
                 (id INTEGER PRIMARY KEY, title TEXT, status TEXT)"""
    )
    # Sayfalar tablosu
    c.execute(
        """CREATE TABLE IF NOT EXISTS pages 
                 (id INTEGER PRIMARY KEY, book_id INTEGER, page_num INTEGER, 
                  image_path TEXT, raw_text TEXT, layout_json TEXT, 
                  FOREIGN KEY(book_id) REFERENCES books(id))"""
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
        >>> cursor = conn.execute("SELECT * FROM books")
        >>> for row in cursor:
        ...     print(row["title"])
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn
