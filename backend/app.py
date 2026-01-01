from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil, os, time
from database import init_db, get_db_connection
from ocr_engine import process_page

from spellchecker import SpellChecker

app = FastAPI()

# Şimdilik language=None diyoruz çünkü Türkçe sözlük dosyasını henüz indirmedik.
# Bu sayede kod patlamaz, sadece henüz düzeltme yapmaz.
spell = SpellChecker(language=None)

# React (Localhost:5173) erişimi için izin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resimleri frontend'e sunmak için statik yol
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from logger import log_manager
from fastapi import Request, WebSocket, WebSocketDisconnect


@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await log_manager.connect(websocket)
    try:
        while True:
            # Keep alive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        log_manager.disconnect(websocket)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    client_host = request.client.host if request.client else "unknown"
    await log_manager.log(
        f"Request: {request.method} {request.url.path} from {client_host}", "backend"
    )
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    await log_manager.log(
        f"Response: {response.status_code} (took {duration:.2f}s)", "backend"
    )
    return response


@app.on_event("startup")
async def startup():
    await log_manager.log("System: Application startup initiated.", "system")
    if not os.path.exists("uploads"):
        os.makedirs("uploads")
        await log_manager.log("System: Created 'uploads' directory.", "system")

    try:
        init_db()
        await log_manager.log("System: Database initialized successfully.", "system")
    except Exception as e:
        await log_manager.log(
            f"System Error: Database initialization failed: {e}", "system"
        )


@app.post("/upload")
async def upload_pdf_page(file: UploadFile = File(...)):
    await log_manager.log(
        f"Starting upload for file: {file.filename} (Type: {file.content_type})",
        "backend",
    )

    # Check file size (approximate)
    file_size = 0
    file_path = f"uploads/{file.filename}"

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)
        await log_manager.log(
            f"File saved: {file_path} ({file_size / 1024:.2f} KB)", "backend"
        )
    except Exception as e:
        await log_manager.log(f"Upload Error: Failed to save file: {e}", "backend")
        return {"status": "error", "message": f"Upload failed: {e}"}

    # İşleme Başla
    try:
        await log_manager.log("Starting OCR processing...", "backend")
        # 1. Önce OCR yap
        clean_path, text, layout = await process_page(file_path)

        await log_manager.log("OCR completed. Analysing text...", "backend")
        # OCR'dan çıkan metni kelimelere böl
        words = text.split()

        # Bilinmeyen (hatalı olma ihtimali olan) kelimeleri bul
        misspelled = spell.unknown(words)

        # Set kümesini listeye çevir (JSON serileştirme hatası almamak için)
        typos_list = list(misspelled)

        await log_manager.log(
            f"Analysis complete. Found {len(typos_list)} potential typos in {len(words)} words.",
            "backend",
        )

        return {
            "status": "success",
            "clean_image": clean_path,
            "text": text,
            "layout": layout,
            "typos": typos_list,
        }
    except Exception as e:
        await log_manager.log(f"Error during processing: {str(e)}", "backend")
        return {"status": "error", "message": str(e)}


@app.get("/list-uploads")
async def list_uploads():
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        return []

    files = []
    for filename in os.listdir(uploads_dir):
        if os.path.isfile(os.path.join(uploads_dir, filename)):
            files.append(filename)

    return {"files": files}


@app.delete("/delete-upload/{filename}")
async def delete_upload(filename: str):
    file_path = os.path.join("uploads", filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        await log_manager.log(f"Deleted file: {filename}", "backend")
        return {"status": "success", "message": f"{filename} deleted"}
    else:
        return {"status": "error", "message": "File not found"}


@app.post("/process-existing/{filename}")
async def process_existing_file(filename: str):
    file_path = os.path.join("uploads", filename)
    if not os.path.exists(file_path):
        return {"status": "error", "message": "File not found"}

    await log_manager.log(
        f"Starting processing for existing file: {filename}", "backend"
    )

    try:
        await log_manager.log("Starting OCR processing...", "backend")
        # 1. Önce OCR yap
        clean_path, text, layout = await process_page(file_path)

        await log_manager.log("OCR completed. Analysing text...", "backend")
        # OCR'dan çıkan metni kelimelere böl
        words = text.split()

        # Bilinmeyen (hatalı olma ihtimali olan) kelimeleri bul
        misspelled = spell.unknown(words)

        # Set kümesini listeye çevir (JSON serileştirme hatası almamak için)
        typos_list = list(misspelled)

        await log_manager.log(
            f"Analysis complete. Found {len(typos_list)} potential typos in {len(words)} words.",
            "backend",
        )

        return {
            "status": "success",
            "clean_image": clean_path,
            "text": text,
            "layout": layout,
            "typos": typos_list,
        }
    except Exception as e:
        await log_manager.log(f"Error during processing: {str(e)}", "backend")
        return {"status": "error", "message": str(e)}
