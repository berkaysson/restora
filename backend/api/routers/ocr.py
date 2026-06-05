from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
from application.use_cases.upload_document import UploadDocumentUseCase
from application.use_cases.reprocess_document import ReprocessDocumentUseCase
from application.use_cases.list_documents import ListDocumentsUseCase
from application.use_cases.delete_document import DeleteDocumentUseCase
from application.use_cases.cancel_job import CancelJobUseCase
from application.dto.document_dto import DocumentDTO
from api.dependencies import (
    get_upload_use_case,
    get_reprocess_document_use_case,
    get_list_documents_use_case,
    get_delete_document_use_case,
    get_cancel_job_use_case
)

router = APIRouter(prefix="/ocr", tags=["OCR"])

@router.post("/upload", response_model=DocumentDTO)
async def upload_document(
    file: UploadFile = File(...),
    use_case: UploadDocumentUseCase = Depends(get_upload_use_case)
):
    """
    Doküman yükler ve işlemeyi başlatır.
    Hem PDF hem de resim dosyalarını destekler.
    """
    try:
        content = await file.read()
        result = await use_case.execute(file.filename, content)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Yükleme hatası: {str(e)}")

@router.get("/list-uploads", response_model=List[DocumentDTO])
async def list_uploads(
    use_case: ListDocumentsUseCase = Depends(get_list_documents_use_case)
):
    """
    Tüm yüklenen dokümanları listeler.
    """
    return await use_case.execute()

@router.delete("/delete-upload/{job_id}")
async def delete_upload(
    job_id: str,
    use_case: DeleteDocumentUseCase = Depends(get_delete_document_use_case)
):
    """
    Bir dokümanı ve ilgili tüm dosyaları siler.
    """
    success = await use_case.execute(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Doküman bulunamadı")
    return {"status": "success", "message": f"Doküman {job_id} silindi"}

@router.post("/process-existing/{job_id}", response_model=DocumentDTO)
async def reprocess_document(
    job_id: str,
    use_case: ReprocessDocumentUseCase = Depends(get_reprocess_document_use_case)
):
    """
    Mevcut bir dokümanı yeniden işler.
    """
    try:
        result = await use_case.execute(job_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İşleme hatası: {str(e)}")


@router.post("/cancel/{job_id}")
async def cancel_job(
    job_id: str,
    use_case: CancelJobUseCase = Depends(get_cancel_job_use_case)
):
    """
    Devam eden bir OCR işlemini iptal eder.
    """
    success = await use_case.execute(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Doküman bulunamadı veya iptal edilemedi")
    return {"status": "success", "message": f"İşlem {job_id} iptal edildi"}
