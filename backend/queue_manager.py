"""
PDF Processing Queue Manager.

Handles asynchronous processing of multi-page PDF documents.
Manages job queue, page processing, and status tracking.
"""

import asyncio
from typing import Optional, Dict, Any
from logger import log_manager
from storage_manager import storage_manager
from db_helpers import (
    create_document,
    create_page_records,
    update_document_status,
    update_page_status,
    update_page_data,
    get_pages_by_status,
    get_document_progress,
)
from engine import preprocessor, ocr
import time
import json
from app.routers.websocket import connection_manager


class ProcessingQueue:
    """Manages asynchronous PDF processing queue."""

    def __init__(self, max_concurrent: int = 2):
        """
        Initialize processing queue.

        Args:
            max_concurrent: Maximum number of pages to process concurrently
        """
        self.max_concurrent = max_concurrent
        self.queue: asyncio.Queue = asyncio.Queue()
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.processing = False

    async def add_pdf_job(
        self, job_id: str, pdf_path: str, filename: str
    ) -> Dict[str, Any]:
        """
        Add a PDF to the processing queue.

        Args:
            job_id: Unique job identifier
            pdf_path: Path to PDF file
            filename: Original filename

        Returns:
            Job information dictionary
        """
        try:
            # Get total pages
            total_pages = await preprocessor.get_pdf_page_count(pdf_path)

            await log_manager.log(
                f"Queue: Adding job {job_id} with {total_pages} pages", "backend"
            )

            # Create job directory
            storage_manager.create_job_directory(job_id)

            # Save original PDF to job directory
            stored_pdf_path = storage_manager.save_original_pdf(job_id, pdf_path)

            # Save metadata
            metadata = {
                "job_id": job_id,
                "filename": filename,
                "total_pages": total_pages,
                "pdf_path": stored_pdf_path,
                "type": "multi_page",
                "created_at": time.time(),
            }
            storage_manager.save_metadata(job_id, metadata)

            # Create database records
            create_document(job_id, filename, total_pages, stored_pdf_path)
            create_page_records(job_id, total_pages)

            # Add to active jobs
            self.active_jobs[job_id] = {
                "total_pages": total_pages,
                "processed_pages": 0,
                "pdf_path": stored_pdf_path,
                "cancelled": False,
            }

            # Add pages to queue
            for page_num in range(1, total_pages + 1):
                await self.queue.put((job_id, page_num, stored_pdf_path))

            # Update document status
            update_document_status(job_id, "processing")

            return {
                "job_id": job_id,
                "total_pages": total_pages,
                "status": "processing",
            }

        except Exception as e:
            await log_manager.log(f"Queue: Error adding job {job_id}: {e}", "backend")
            update_document_status(job_id, "failed")
            raise

    async def process_page(self, job_id: str, page_number: int, pdf_path: str) -> None:
        """
        Process a single page from a PDF.

        Args:
            job_id: Job identifier
            page_number: Page number to process
            pdf_path: Path to PDF file
        """
        # Check if job was cancelled
        if self.active_jobs.get(job_id, {}).get("cancelled"):
            await log_manager.log(
                f"Queue: Skipping page {page_number} of job {job_id} (cancelled)",
                "backend",
            )
            return

        start_time = time.time()

        try:
            await log_manager.log(
                f"Queue: Processing page {page_number} of job {job_id}", "backend"
            )

            # Update page status to processing
            update_page_status(job_id, page_number, "processing")

            # Broadcast page started
            await connection_manager.broadcast(
                job_id,
                {
                    "event": "page_started",
                    "job_id": job_id,
                    "page_number": page_number,
                    "status": "processing",
                },
            )

            # Extract page from PDF
            page_image_path = await preprocessor.extract_pdf_page(pdf_path, page_number)

            # Save to proper location
            final_image_path = storage_manager.get_page_image_path(job_id, page_number)
            import shutil

            shutil.move(page_image_path, final_image_path)

            # Run OCR
            text, layout = await ocr.run_ocr(final_image_path)

            # Calculate confidence
            confidence_score = self._calculate_confidence(layout)

            # Save OCR data
            ocr_data = {"text": text, "layout": layout, "confidence": confidence_score}
            storage_manager.save_page_ocr(job_id, page_number, ocr_data)

            # Update database
            processing_time = time.time() - start_time
            update_page_data(
                job_id,
                page_number,
                final_image_path,
                text,
                json.dumps(layout),
                confidence_score,
                processing_time,
            )

            # Update job progress
            if job_id in self.active_jobs:
                self.active_jobs[job_id]["processed_pages"] += 1
                processed = self.active_jobs[job_id]["processed_pages"]
                total = self.active_jobs[job_id]["total_pages"]

                update_document_status(job_id, "processing", processed)

                # Broadcast page completion
                progress_percent = (processed / total) * 100
                await connection_manager.broadcast(
                    job_id,
                    {
                        "event": "page_completed",
                        "job_id": job_id,
                        "page_number": page_number,
                        "total_pages": total,
                        "processed_pages": processed,
                        "progress": progress_percent,
                        "status": "processing",
                        "ocr_data": ocr_data,  # Optional: send data for immediate display
                    },
                )

                await log_manager.log(
                    f"Queue: Completed page {page_number}/{total} of job {job_id} "
                    f"({processed}/{total} processed, {processing_time:.2f}s)",
                    "backend",
                )

                # Check if all pages are complete
                if processed >= total:
                    await self._complete_job(job_id)

        except Exception as e:
            await log_manager.log(
                f"Queue: Error processing page {page_number} of job {job_id}: {e}",
                "backend",
            )
            update_page_status(job_id, page_number, "failed", str(e))

            await connection_manager.broadcast(
                job_id,
                {
                    "event": "page_failed",
                    "job_id": job_id,
                    "page_number": page_number,
                    "error": str(e),
                    "status": "failed",
                },
            )

    def _calculate_confidence(self, layout: Dict[str, Any]) -> float:
        """
        Calculate average confidence score from layout data.

        Args:
            layout: OCR layout dictionary

        Returns:
            Average confidence score (0-1)
        """
        text_lines = layout.get("text_lines", [])
        if not text_lines:
            return 0.0

        confidences = [line.get("confidence", 0) for line in text_lines]
        return sum(confidences) / len(confidences) if confidences else 0.0

    async def _complete_job(self, job_id: str) -> None:
        """
        Mark a job as completed.

        Args:
            job_id: Job identifier
        """
        update_document_status(job_id, "completed")

        progress = get_document_progress(job_id)

        await log_manager.log(
            f"Queue: Job {job_id} completed! "
            f"{progress['completed_pages']}/{progress['total_pages']} pages processed, "
            f"{progress['failed_pages']} failed",
            "backend",
        )

        await connection_manager.broadcast(
            job_id,
            {
                "event": "job_completed",
                "job_id": job_id,
                "total_pages": progress["total_pages"],
                "processed_pages": progress["completed_pages"],
                "failed_pages": progress["failed_pages"],
                "status": "completed",
            },
        )

        # Remove from active jobs
        if job_id in self.active_jobs:
            del self.active_jobs[job_id]

    async def cancel_job(self, job_id: str) -> None:
        """
        Cancel an active job.

        Args:
            job_id: Job identifier
        """
        if job_id in self.active_jobs:
            self.active_jobs[job_id]["cancelled"] = True
            update_document_status(job_id, "cancelled")

            await connection_manager.broadcast(
                job_id,
                {"event": "job_cancelled", "job_id": job_id, "status": "cancelled"},
            )

            await log_manager.log(f"Queue: Job {job_id} cancelled", "backend")

    async def start_processing(self) -> None:
        """Start the processing queue worker."""
        self.processing = True

        await log_manager.log(
            f"Queue: Starting worker with {self.max_concurrent} concurrent workers",
            "backend",
        )

        # Create concurrent workers
        workers = [
            asyncio.create_task(self._worker(i)) for i in range(self.max_concurrent)
        ]

        await asyncio.gather(*workers)

    async def _worker(self, worker_id: int) -> None:
        """
        Queue worker that processes pages.

        Args:
            worker_id: Worker identifier
        """
        await log_manager.log(f"Queue: Worker {worker_id} started", "backend")

        while self.processing:
            try:
                # Get next page from queue (with timeout)
                job_id, page_number, pdf_path = await asyncio.wait_for(
                    self.queue.get(), timeout=5.0
                )

                # Process the page
                await self.process_page(job_id, page_number, pdf_path)

                # Mark task as done
                self.queue.task_done()

            except asyncio.TimeoutError:
                # No items in queue, continue waiting
                continue
            except Exception as e:
                await log_manager.log(
                    f"Queue: Worker {worker_id} error: {e}", "backend"
                )

    async def stop_processing(self) -> None:
        """Stop the processing queue."""
        self.processing = False
        await log_manager.log("Queue: Stopping workers", "backend")


# Singleton instance
processing_queue = ProcessingQueue(max_concurrent=2)
