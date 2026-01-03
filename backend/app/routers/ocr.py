from fastapi import APIRouter, UploadFile, File
import shutil, os, time, uuid
from logger import log_manager
from app.utils import process_ocr_and_spellcheck

router = APIRouter()


@router.post("/upload")
async def upload_pdf_page(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    job_dir = f"uploads/{job_id}"
    os.makedirs(job_dir, exist_ok=True)

    await log_manager.log(
        f"Starting upload for file: {file.filename} (Type: {file.content_type}, Job ID: {job_id})",
        "backend",
    )

    # Check file size (approximate)
    file_size = 0
    file_path = f"{job_dir}/{file.filename}"

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
    return await process_ocr_and_spellcheck(file_path, job_id)


@router.get("/list-uploads")
async def list_uploads():
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        return []

    jobs = []

    # Iterate over directories in uploads/
    with os.scandir(uploads_dir) as entries:
        for entry in entries:
            if entry.is_dir():
                job_id = entry.name
                job_path = entry.path

                # Default values
                upload_date = time.strftime(
                    "%Y-%m-%d %H:%M:%S", time.localtime(entry.stat().st_mtime)
                )
                original_file = None
                processed_files = []

                # Scan files inside the job directory
                files_in_job = os.listdir(job_path)
                for f in files_in_job:
                    full_path = f"uploads/{job_id}/{f}"
                    if "_clean" in f or f.endswith(".json"):
                        processed_files.append(full_path)
                    else:
                        # Assume the file without _clean and not .json is the original
                        original_file = full_path

                if original_file:
                    jobs.append(
                        {
                            "id": job_id,
                            "upload_date": upload_date,
                            "original_file": original_file,
                            "processed_files": processed_files,
                        }
                    )

    # Sort by upload date desc
    jobs.sort(key=lambda x: x["upload_date"], reverse=True)
    return {"jobs": jobs}


@router.delete("/delete-upload/{job_id}")
async def delete_upload(job_id: str):
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
async def process_existing_file(job_id: str):
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
