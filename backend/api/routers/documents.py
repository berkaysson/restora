from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from application.use_cases.get_document import GetDocumentUseCase
from application.use_cases.list_documents import ListDocumentsUseCase
from application.dto.document_dto import DocumentDTO, PageDTO
from api.dependencies import (
    get_get_document_use_case,
    get_list_documents_use_case
)

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("", response_model=List[DocumentDTO])
async def list_documents(
    use_case: ListDocumentsUseCase = Depends(get_list_documents_use_case)
):
    """
    Tüm dokümanları listeler.
    """
    return await use_case.execute()

@router.get("/{job_id}", response_model=DocumentDTO)
async def get_document(
    job_id: str,
    use_case: GetDocumentUseCase = Depends(get_get_document_use_case)
):
    """
    Belirli bir dokümanın detaylarını ve durumunu getirir.
    """
    doc = await use_case.execute(job_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doküman bulunamadı")
    return doc

@router.get("/{job_id}/pages", response_model=List[PageDTO])
async def list_pages(
    job_id: str,
    use_case: GetDocumentUseCase = Depends(get_get_document_use_case) # Using get_document for now as it includes pages
):
    """
    Bir dokümana ait sayfaları listeler.
    """
    doc = await use_case.execute(job_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doküman bulunamadı")
    return doc.pages

@router.get("/{job_id}/pages/{page_number}", response_model=PageDTO)
async def get_page(
    job_id: str,
    page_number: int,
    use_case: GetDocumentUseCase = Depends(get_get_document_use_case)
):
    """
    Belirli bir sayfanın OCR verilerini ve detaylarını getirir.
    """
    doc = await use_case.execute(job_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doküman bulunamadı")
    
    page = next((p for p in doc.pages if p.page_number == page_number), None)
    if not page:
        raise HTTPException(status_code=404, detail="Sayfa bulunamadı")
    
    return page
