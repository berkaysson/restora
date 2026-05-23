from fastapi import APIRouter
from api.routers.ocr import router as ocr_router
from api.routers.documents import router as documents_router
from api.routers.websocket import router as websocket_router
from api.routers.logs import router as logs_router

api_router = APIRouter()
api_router.include_router(ocr_router)
api_router.include_router(documents_router)
api_router.include_router(websocket_router)
api_router.include_router(logs_router)

