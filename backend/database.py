import sqlite3

DB_NAME = "restora.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Kitaplar tablosu
    c.execute('''CREATE TABLE IF NOT EXISTS books 
                 (id INTEGER PRIMARY KEY, title TEXT, status TEXT)''')
    # Sayfalar tablosu
    c.execute('''CREATE TABLE IF NOT EXISTS pages 
                 (id INTEGER PRIMARY KEY, book_id INTEGER, page_num INTEGER, 
                  image_path TEXT, raw_text TEXT, layout_json TEXT, 
                  FOREIGN KEY(book_id) REFERENCES books(id))''')
    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn
