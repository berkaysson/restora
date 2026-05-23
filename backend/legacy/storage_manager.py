"""
Storage Manager for PDF Processing.

Handles hierarchical file storage organization for multi-page documents.
Provides utilities for saving/retrieving page images and OCR data.

Storage Structure:
    uploads/
      ├── {job_id}/
      │   ├── original.pdf              # Original uploaded PDF
      │   ├── metadata.json             # Job metadata
      │   └── pages/
      │       ├── page_001.png          # Extracted page images
      │       ├── page_001_ocr.json     # OCR results
      │       ├── page_002.png
      │       ├── page_002_ocr.json
      │       └── ...
"""

import os
import json
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
from logger import log_manager


class StorageManager:
    """Manages file storage for multi-page PDF processing."""

    def __init__(self, base_dir: str = "uploads"):
        """
        Initialize storage manager.

        Args:
            base_dir: Base directory for all uploads (default: "uploads")
        """
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)

    def create_job_directory(self, job_id: str) -> Path:
        """
        Create directory structure for a new job.

        Args:
            job_id: Unique job identifier (UUID)

        Returns:
            Path to job directory

        Example:
            >>> storage = StorageManager()
            >>> job_path = storage.create_job_directory("abc-123")
            >>> print(job_path)  # Path('uploads/abc-123')
        """
        job_dir = self.base_dir / job_id
        pages_dir = job_dir / "pages"

        job_dir.mkdir(exist_ok=True)
        pages_dir.mkdir(exist_ok=True)

        return job_dir

    def get_job_directory(self, job_id: str) -> Path:
        """
        Get path to job directory.

        Args:
            job_id: Unique job identifier

        Returns:
            Path to job directory
        """
        return self.base_dir / job_id

    def get_pages_directory(self, job_id: str) -> Path:
        """
        Get path to pages directory for a job.

        Args:
            job_id: Unique job identifier

        Returns:
            Path to pages directory
        """
        return self.base_dir / job_id / "pages"

    def save_original_pdf(self, job_id: str, pdf_path: str) -> str:
        """
        Copy original PDF to job directory.

        Args:
            job_id: Unique job identifier
            pdf_path: Path to original PDF file

        Returns:
            Path to saved PDF file
        """
        job_dir = self.get_job_directory(job_id)
        dest_path = job_dir / "original.pdf"

        shutil.copy2(pdf_path, dest_path)

        return str(dest_path)

    def save_metadata(self, job_id: str, metadata: Dict[str, Any]) -> None:
        """
        Save job metadata as JSON.

        Args:
            job_id: Unique job identifier
            metadata: Dictionary containing job metadata
        """
        job_dir = self.get_job_directory(job_id)
        metadata_path = job_dir / "metadata.json"

        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

    def get_metadata(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Load job metadata.

        Args:
            job_id: Unique job identifier

        Returns:
            Metadata dictionary or None if not found
        """
        job_dir = self.get_job_directory(job_id)
        metadata_path = job_dir / "metadata.json"

        if not metadata_path.exists():
            return None

        with open(metadata_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_page_image_path(self, job_id: str, page_number: int) -> str:
        """
        Get path for page image file.

        Args:
            job_id: Unique job identifier
            page_number: Page number (1-indexed)

        Returns:
            Path where page image should be stored
        """
        pages_dir = self.get_pages_directory(job_id)
        filename = f"page_{page_number:03d}.png"
        return str(pages_dir / filename)

    def get_page_ocr_path(self, job_id: str, page_number: int) -> str:
        """
        Get path for page OCR JSON file.

        Args:
            job_id: Unique job identifier
            page_number: Page number (1-indexed)

        Returns:
            Path where page OCR data should be stored
        """
        pages_dir = self.get_pages_directory(job_id)
        filename = f"page_{page_number:03d}_ocr.json"
        return str(pages_dir / filename)

    def save_page_ocr(
        self, job_id: str, page_number: int, ocr_data: Dict[str, Any]
    ) -> str:
        """
        Save OCR data for a page.

        Args:
            job_id: Unique job identifier
            page_number: Page number (1-indexed)
            ocr_data: OCR results dictionary

        Returns:
            Path to saved OCR file
        """
        ocr_path = self.get_page_ocr_path(job_id, page_number)

        with open(ocr_path, "w", encoding="utf-8") as f:
            json.dump(ocr_data, f, indent=2, ensure_ascii=False)

        return ocr_path

    def get_page_ocr(self, job_id: str, page_number: int) -> Optional[Dict[str, Any]]:
        """
        Load OCR data for a page.

        Args:
            job_id: Unique job identifier
            page_number: Page number (1-indexed)

        Returns:
            OCR data dictionary or None if not found
        """
        ocr_path = self.get_page_ocr_path(job_id, page_number)

        if not os.path.exists(ocr_path):
            return None

        with open(ocr_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def page_exists(self, job_id: str, page_number: int) -> bool:
        """
        Check if page data exists.

        Args:
            job_id: Unique job identifier
            page_number: Page number (1-indexed)

        Returns:
            True if both image and OCR data exist
        """
        image_path = self.get_page_image_path(job_id, page_number)
        ocr_path = self.get_page_ocr_path(job_id, page_number)

        return os.path.exists(image_path) and os.path.exists(ocr_path)

    def cleanup_job(self, job_id: str) -> None:
        """
        Delete all files for a job.

        Args:
            job_id: Unique job identifier
        """
        job_dir = self.get_job_directory(job_id)

        if job_dir.exists():
            shutil.rmtree(job_dir)

    def estimate_storage_size(
        self, total_pages: int, avg_page_size_mb: float = 3.0
    ) -> float:
        """
        Estimate storage requirements for a document.

        Args:
            total_pages: Number of pages in document
            avg_page_size_mb: Average size per page in MB (default: 3.0)

        Returns:
            Estimated storage in MB

        Example:
            >>> storage = StorageManager()
            >>> size = storage.estimate_storage_size(1000)
            >>> print(f"Estimated: {size}MB")  # ~3000MB for 1000 pages
        """
        # Each page: image (~2MB) + OCR JSON (~1MB) + overhead
        return total_pages * avg_page_size_mb

    def get_job_size(self, job_id: str) -> float:
        """
        Calculate actual storage used by a job.

        Args:
            job_id: Unique job identifier

        Returns:
            Size in MB
        """
        job_dir = self.get_job_directory(job_id)

        if not job_dir.exists():
            return 0.0

        total_size = 0
        for dirpath, dirnames, filenames in os.walk(job_dir):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                total_size += os.path.getsize(filepath)

        return total_size / (1024 * 1024)  # Convert to MB

    def get_export_path(self, job_id: str, format: str) -> str:
        """
        Get path for exported file.

        Args:
            job_id: Unique job identifier
            format: Export format (pdf, txt, json)

        Returns:
            Path where exported file should be stored
        """
        job_dir = self.get_job_directory(job_id)
        exports_dir = job_dir / "exports"
        exports_dir.mkdir(exist_ok=True)

        # Get original filename from metadata specific to this job
        metadata = self.get_metadata(job_id)
        original_filename = "document"
        if metadata and "filename" in metadata:
            original_filename = Path(metadata["filename"]).stem

        filename = f"{original_filename}_export.{format}"
        return str(exports_dir / filename)


# Singleton instance
storage_manager = StorageManager()
