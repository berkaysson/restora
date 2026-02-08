"""
OCR API Router.

This module defines the REST API endpoints for file upload,
processing, and management operations.

Endpoints:
    POST /upload: Upload and process a new document
    GET /list-uploads: List all processed jobs
    DELETE /delete-upload/{job_id}: Delete a processing job
    POST /process-existing/{job_id}: Reprocess an existing document
"""

from fastapi import APIRouter, UploadFile, File
import shutil, os, time, uuid
from logger import log_manager
from app.utils import process_ocr_and_spellcheck
from storage_manager import storage_manager
import json

router = APIRouter()


@router.post("/upload")
async def upload_pdf_page(file: UploadFile = File(...)) -> dict:
    """Upload and process a document for OCR text extraction.

    Accepts PDF or image files, saves them to a unique job directory,
    and processes them through the OCR pipeline.

    Args:
        file: The uploaded file (PDF, JPG, or PNG).

    Returns:
        dict: Processing result containing:
            - status: "success" or "error"
            - job_id: Unique identifier for this job
            - clean_image: Path to processed image
            - text: Extracted text content
            - layout: Layout analysis with text_lines and layout_blocks
            - typos: List of potential spelling errors

    Example:
        >>> # POST /upload with multipart/form-data
        >>> response = {"status": "success", "job_id": "abc-123", ...}
    """
    job_id = str(uuid.uuid4())
    # Use storage manager to create directory (consistency)
    storage_manager.create_job_directory(job_id)
    job_dir = storage_manager.get_job_directory(job_id)

    await log_manager.log(
        f"Starting upload for file: {file.filename} (Type: {file.content_type}, Job ID: {job_id})",
        "backend",
    )

    # Check file size (approximate)
    file_size = 0
    file_path = job_dir / file.filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)

        # Create and save metadata
        metadata = {
            "job_id": job_id,
            "filename": file.filename,
            "upload_date": time.time(),
            "total_pages": 1,
            "type": "single_page",
            "status": "processing",
        }
        storage_manager.save_metadata(job_id, metadata)

        await log_manager.log(
            f"File saved: {file_path} ({file_size / 1024:.2f} KB) with metadata",
            "backend",
        )
    except Exception as e:
        await log_manager.log(f"Upload Error: Failed to save file: {e}", "backend")
        return {"status": "error", "message": f"Upload failed: {e}"}

    # İşleme Başla
    # Convert path to string for compatibility with existing utils
    return await process_ocr_and_spellcheck(str(file_path), job_id)


@router.get("/list-uploads")
async def list_uploads() -> dict:
    """List all processed document jobs.

    Scans the uploads directory and returns metadata for all
    previously processed documents, sorted by date (newest first).

    Returns:
        dict: Contains 'jobs' list, each job having:
            - id: Unique job identifier (UUID)
            - upload_date: When the file was uploaded
            - original_file: Path to the original uploaded file
            - processed_files: List of generated files (clean images, JSON)
            - filename: Original filename (from metadata)
            - total_pages: Total number of pages
            - type: Job type (single_page, multi_page)
    """
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        return []

    jobs = []

    # Iterate over directories in uploads/
    with os.scandir(uploads_dir) as entries:
        for entry in entries:
            if entry.is_dir():
                job_id = entry.name

                # Try to get metadata using storage manager
                metadata = storage_manager.get_metadata(job_id)

                # Default values
                upload_date = time.strftime(
                    "%Y-%m-%d %H:%M:%S", time.localtime(entry.stat().st_mtime)
                )
                original_file = None
                processed_files = []
                filename = None
                total_pages = 1
                job_type = "single_page"

                # If metadata exists, use it
                if metadata:
                    if "filename" in metadata:
                        filename = metadata["filename"]
                    if "total_pages" in metadata:
                        total_pages = metadata["total_pages"]
                    if "type" in metadata:
                        job_type = metadata["type"]
                    elif total_pages > 1:
                        job_type = "multi_page"

                    # Optionally use upload_date from metadata if stored as timestamp
                    if "upload_date" in metadata:
                        try:
                            upload_date = time.strftime(
                                "%Y-%m-%d %H:%M:%S",
                                time.localtime(metadata["upload_date"]),
                            )
                        except:
                            pass  # Keep fs time if conversion fails

                # Scan files inside the job directory for legacy support/file listing
                # (We still need processed_files list)
                try:
                    files_in_job = os.listdir(entry.path)
                    for f in files_in_job:
                        full_path = f"uploads/{job_id}/{f}"
                        if "_clean" in f or f.endswith(".json") or f == "pages":
                            processed_files.append(full_path)
                        elif f != "metadata.json" and f != "original.pdf":
                            # Legacy: Assume the file without _clean/json/pages/metadata is original
                            original_file = full_path
                except OSError:
                    continue

                # If we have metadata filename but no original_file detected (e.g. multi-page with original.pdf)
                # Ensure we have a display name
                if not filename and original_file:
                    filename = os.path.basename(original_file)

                # For multi-page, original_file might be internal "original.pdf",
                # so we might want to expose the metadata filename as principal identifier

                jobs.append(
                    {
                        "id": job_id,
                        "upload_date": upload_date,
                        "original_file": original_file
                        or f"uploads/{job_id}/original.pdf",  # Fallback
                        "filename": filename,
                        "total_pages": total_pages,
                        "type": job_type,
                        "processed_files": processed_files,
                    }
                )

    # Sort by upload date desc
    jobs.sort(key=lambda x: x["upload_date"], reverse=True)
    return {"jobs": jobs}


@router.delete("/delete-upload/{job_id}")
async def delete_upload(job_id: str) -> dict:
    """Delete a processing job and all associated files.

    Removes the entire job directory including original file,
    processed images, and result JSON.

    Args:
        job_id: The unique job identifier to delete.

    Returns:
        dict: Status message indicating success or failure.
    """
    job_dir = os.path.join("uploads", job_id)
    if os.path.exists(job_dir) and os.path.isdir(job_dir):
        try:
            shutil.rmtree(job_dir)
            await log_manager.log(f"Deleted job directory: {job_id}", "backend")
            return {"status": "success", "message": f"Job {job_id} deleted"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to delete: {e}"}
    else:
        return {"status": "error", "message": "Job not found"}


@router.post("/process-existing/{job_id}")
async def process_existing_file(job_id: str) -> dict:
    """Reprocess an existing document job.

    Finds the original file in the job directory and runs it
    through the OCR pipeline again. Useful for applying updated
    models or parameters to previously uploaded documents.

    Args:
        job_id: The unique job identifier to reprocess.

    Returns:
        dict: Same format as /upload endpoint with updated results.
    """
    job_dir = os.path.join("uploads", job_id)
    if not os.path.exists(job_dir):
        return {"status": "error", "message": "Job not found"}

    # Find original file
    original_file = None
    # Check if directory exists before listing
    if os.path.isdir(job_dir):
        for f in os.listdir(job_dir):
            if "_clean" not in f and not f.endswith(".json"):
                original_file = f
                break

    if not original_file:
        return {
            "status": "error",
            "message": "Original file not found in job directory",
        }

    file_path = os.path.join(job_dir, original_file)

    await log_manager.log(
        f"Starting processing for existing job: {job_id}, file: {original_file}",
        "backend",
    )

    return await process_ocr_and_spellcheck(file_path, job_id)
