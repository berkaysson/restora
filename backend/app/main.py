from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os, time
from database import init_db
from logger import log_manager
from app.routers import ocr, logs

app = FastAPI()

# React (Localhost:5173) erişimi için izin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resimleri frontend'e sunmak için statik yol
# Assuming 'uploads' is in the root (where uvicorn runs)
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


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
    # Also ensure uploads exists here just in case logging needs it or logic
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


app.include_router(ocr.router)
app.include_router(logs.router)
