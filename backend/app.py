from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil, os
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
    await log_manager.log(f"Request: {request.method} {request.url.path}", "backend")
    response = await call_next(request)
    await log_manager.log(f"Response: {response.status_code}", "backend")
    return response


@app.on_event("startup")
def startup():
    if not os.path.exists("uploads"):
        os.makedirs("uploads")
    init_db()


@app.post("/upload")
async def upload_pdf_page(file: UploadFile = File(...)):
    await log_manager.log(f"Starting upload for file: {file.filename}", "backend")
    # Demo için tek sayfa upload kabul ediyoruz
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # İşleme Başla
    try:
        await log_manager.log("Starting OCR processing...", "backend")
        # 1. Önce OCR yap
        clean_path, text, layout = await process_page(file_path)

        await log_manager.log("OCR completed. Analysing text...", "backend")
        # OCR'dan çıkan metni kelimelere böl
        # (Daha iyi sonuç için regex kullanılabilir ama şimdilik split yeterli)
        words = text.split()

        # Bilinmeyen (hatalı olma ihtimali olan) kelimeleri bul
        misspelled = spell.unknown(words)

        # Set kümesini listeye çevir (JSON serileştirme hatası almamak için)
        typos_list = list(misspelled)

        await log_manager.log(
            f"Analysis complete. Found {len(typos_list)} potential typos.", "backend"
        )

        return {
            "status": "success",
            "clean_image": clean_path,
            "text": text,
            "layout": layout,
            "typos": typos_list,  # ### YENİ: Hataları Frontend'e gönderiyoruz ###
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
        # Sadece dosyaları listele (ignore _clean.jpg versions if you want, but for now list all)
        # Maybe filter to show only original files?
        # For simplicity, let's list all for now, or maybe exclude _clean ones to avoid clutter
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
            f"Analysis complete. Found {len(typos_list)} potential typos.", "backend"
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
