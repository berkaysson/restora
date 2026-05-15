from fastapi import APIRouter
from api.routers.ocr import router as ocr_router
from api.routers.documents import router as documents_router

api_router = APIRouter()
api_router.include_router(ocr_router)
api_router.include_router(documents_router)
