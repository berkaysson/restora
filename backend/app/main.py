from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os, time
from database import init_db
from logger import log_manager
from app.routers import ocr, logs, pdf, websocket
from api.router import api_router

app = FastAPI()

# React (Localhost:5173) erişimi için izin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Resimleri frontend'e sunmak için statik yol
# Ensure 'uploads' directory exists in the project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


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


# Startup and Shutdown Events
@app.on_event("startup")
async def startup_event():  # Renamed from startup
    """Initialize application on startup."""
    await log_manager.log(
        "FastAPI: Application starting...", "backend"
    )  # Changed log message

    # Start processing queue
    from queue_manager import processing_queue
    import asyncio

    asyncio.create_task(processing_queue.start_processing())

    # Start new clean architecture queue
    from api.dependencies import get_task_queue
    new_queue = get_task_queue()
    await new_queue.start()

    # Also ensure uploads exists here just in case logging needs it or logic
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
        await log_manager.log(f"System: Created '{UPLOAD_DIR}' directory.", "system")

    try:
        init_db()
        await log_manager.log("System: Database initialized successfully.", "system")
    except Exception as e:
        await log_manager.log(
            f"System Error: Database initialization failed: {e}", "system"
        )


# Register API Routers
app.include_router(ocr.router, tags=["OCR (Legacy)"])
app.include_router(logs.router, tags=["Logs"])
app.include_router(pdf.router, tags=["PDF Processing"])
app.include_router(websocket.router, tags=["Real-time Updates"])

# New Clean Architecture API
app.include_router(api_router, prefix="/api/v2")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown."""
    await log_manager.log("FastAPI: Application shutting down...", "backend")

    # Stop processing queue
    from queue_manager import processing_queue

    await processing_queue.stop_processing()

    # Stop new clean architecture queue
    from api.dependencies import get_task_queue
    new_queue = get_task_queue()
    await new_queue.stop()
