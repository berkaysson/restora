"""
Multi-Page PDF Processing API Router.

Provides endpoints for processing large multi-page PDFs with
asynchronous queue-based processing and real-time progress tracking.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional
import os
import uuid
from logger import log_manager
from queue_manager import processing_queue
from db_helpers import (
    get_document,
    get_document_progress,
    get_document_pages,
    get_page_data,
    get_pages_by_status,
    delete_document,
)
from storage_manager import storage_manager

router = APIRouter()


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)) -> dict:
    """
    Upload a multi-page PDF for processing.

    Accepts PDF files, creates a job, and starts asynchronous processing.
    Returns immediately with job information.

    Args:
        file: The uploaded PDF file

    Returns:
        dict: Job information containing:
            - status: "success" or "error"
            - job_id: Unique identifier
            - filename: Original file name
            - total_pages: Number of pages in PDF
            - message: Status message
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        return {
            "status": "error",
            "message": "Only PDF files are supported for multi-page processing",
        }

    job_id = str(uuid.uuid4())

    await log_manager.log(f"PDF Upload: {file.filename} (Job ID: {job_id})", "backend")

    # Save uploaded file temporarily
    temp_path = f"uploads/temp_{job_id}.pdf"
    os.makedirs("uploads", exist_ok=True)

    try:
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        file_size = os.path.getsize(temp_path)
        await log_manager.log(
            f"PDF Upload: File saved ({file_size / 1024:.2f} KB)", "backend"
        )

        # Add to processing queue
        result = await processing_queue.add_pdf_job(job_id, temp_path, file.filename)

        return {
            "status": "success",
            **result,
            "filename": file.filename,
            "message": "PDF upload successful, processing started",
        }

    except Exception as e:
        await log_manager.log(f"PDF Upload Error: {e}", "backend")

        # Cleanup temp file on error
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return {"status": "error", "message": f"Failed to process PDF: {str(e)}"}


@router.get("/document/{job_id}/status")
async def get_document_status(job_id: str) -> dict:
    """
    Get processing status for a document.

    Args:
        job_id: Document identifier

    Returns:
        dict: Progress information containing:
            - job_id: Document identifier
            - total_pages: Total pages in document
            - completed_pages: Successfully processed pages
            - failed_pages: Failed pages
            - pending_pages: Not yet processed pages
            - progress_percentage: Completion percentage (0-100)
            - status: Overall document status
    """
    try:
        progress = get_document_progress(job_id)

        if not progress:
            raise HTTPException(status_code=404, detail="Document not found")

        return progress

    except HTTPException:
        raise
    except Exception as e:
        await log_manager.log(f"Error getting document status: {e}", "backend")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{job_id}/pages")
async def list_document_pages(
    job_id: str, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200)
) -> dict:
    """
    Get paginated list of pages for a document.

    Args:
        job_id: Document identifier
        page: Page number for pagination (default: 1)
        limit: Results per page (default: 50, max: 200)

    Returns:
        dict: Contains:
            - pages: List of page data
            - total: Total number of pages
            - page: Current page number
            - limit: Results per page
    """
    try:
        pages, total = get_document_pages(job_id, page, limit)

        return {"pages": pages, "total": total, "page": page, "limit": limit}

    except Exception as e:
        await log_manager.log(f"Error listing pages: {e}", "backend")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{job_id}/page/{page_number}")
async def get_page(job_id: str, page_number: int) -> dict:
    """
    Get OCR data for a specific page.

    Args:
        job_id: Document identifier
        page_number: Page number (1-indexed)

    Returns:
        dict: Page data including OCR text and layout
    """
    try:
        page_data = get_page_data(job_id, page_number)

        if not page_data:
            raise HTTPException(status_code=404, detail=f"Page {page_number} not found")

        # Load OCR data from storage if available
        if page_data["status"] == "completed":
            ocr_data = storage_manager.get_page_ocr(job_id, page_number)
            if ocr_data:
                page_data["ocr_data"] = ocr_data

        return page_data

    except HTTPException:
        raise
    except Exception as e:
        await log_manager.log(f"Error getting page data: {e}", "backend")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document/{job_id}/cancel")
async def cancel_document(job_id: str) -> dict:
    """
    Cancel ongoing document processing.

    Args:
        job_id: Document identifier

    Returns:
        dict: Status message
    """
    try:
        doc = get_document(job_id)

        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        if doc["status"] in ["completed", "cancelled", "failed"]:
            return {
                "status": "error",
                "message": f"Document is already {doc['status']}",
            }

        await processing_queue.cancel_job(job_id)

        return {"status": "success", "message": "Document processing cancelled"}

    except HTTPException:
        raise
    except Exception as e:
        await log_manager.log(f"Error cancelling document: {e}", "backend")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document/{job_id}/retry-failed")
async def retry_failed_pages(job_id: str) -> dict:
    """
    Retry processing failed pages.

    Args:
        job_id: Document identifier

    Returns:
        dict: Status with number of pages queued for retry
    """
    try:
        failed_pages = get_pages_by_status(job_id, "failed")

        if not failed_pages:
            return {
                "status": "success",
                "message": "No failed pages to retry",
                "count": 0,
            }

        doc = get_document(job_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Re-queue failed pages
        for page in failed_pages:
            await processing_queue.queue.put(
                (job_id, page["page_number"], doc["file_path"])
            )

        return {
            "status": "success",
            "message": f"Queued {len(failed_pages)} pages for retry",
            "count": len(failed_pages),
        }

    except HTTPException:
        raise
    except Exception as e:
        await log_manager.log(f"Error retrying failed pages: {e}", "backend")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/document/{job_id}")
async def delete_document_endpoint(job_id: str) -> dict:
    """
    Delete a document and all associated data.

    Args:
        job_id: Document identifier

    Returns:
        dict: Status message
    """
    try:
        doc = get_document(job_id)

        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Cancel if still processing
        if doc["status"] == "processing":
            await processing_queue.cancel_job(job_id)

        # Delete from database
        delete_document(job_id)

        # Delete files
        storage_manager.cleanup_job(job_id)

        return {"status": "success", "message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        await log_manager.log(f"Error deleting document: {e}", "backend")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def list_documents() -> dict:
    """
    List all documents.

    Returns:
        dict: List of all documents with their status
    """
    try:
        from database import get_db_connection

        conn = get_db_connection()
        cursor = conn.execute(
            """SELECT * FROM documents 
               ORDER BY upload_date DESC"""
        )
        docs = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return {"documents": docs, "total": len(docs)}

    except Exception as e:
        await log_manager.log(f"Error listing documents: {e}", "backend")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{job_id}/export")
async def export_document(
    job_id: str,
    format: str = Query("pdf", regex="^(pdf|txt|json)$"),
    pages: Optional[str] = Query(None, description="Page range (e.g., '1-5,7')"),
):
    """
    Export document to specified format.

    Args:
        job_id: Document identifier
        format: Export format (pdf, txt, json)
        pages: Optional page range string (e.g. "1-5, 8, 11-13")

    Returns:
        FileResponse: Downloadable file
    """
    try:
        from export_service import export_service
        from fastapi.responses import FileResponse

        # Parse page range
        page_range_list = []
        if pages:
            try:
                parts = pages.split(",")
                for part in parts:
                    if "-" in part:
                        start, end = map(int, part.split("-"))
                        page_range_list.extend(range(start, end + 1))
                    else:
                        page_range_list.append(int(part))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid page range format")

        # Determine output path
        output_path = storage_manager.get_export_path(job_id, format)

        # Generate export
        if format == "pdf":
            await export_service.create_searchable_pdf(
                job_id, output_path, page_range_list
            )
            media_type = "application/pdf"
        elif format == "txt":
            await export_service.create_text_export(
                job_id, output_path, page_range_list
            )
            media_type = "text/plain"
        elif format == "json":
            await export_service.create_json_export(
                job_id, output_path, page_range_list
            )
            media_type = "application/json"

        filename = os.path.basename(output_path)

        return FileResponse(path=output_path, filename=filename, media_type=media_type)

    except HTTPException:
        raise
    except Exception as e:
        await log_manager.log(f"Error exporting document: {e}", "backend")
        raise HTTPException(status_code=500, detail=str(e))
