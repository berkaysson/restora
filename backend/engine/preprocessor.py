"""
Image Preprocessing Module.

This module handles file preprocessing before OCR analysis:
- PDF to image conversion using pypdfium2
"""

import pypdfium2 as pdfium
import os
import asyncio
from logger import log_manager


async def convert_pdf_to_image(image_path: str) -> str:
    """Convert a PDF file to a high-resolution JPG image."""
    def _convert():
        pdf = pdfium.PdfDocument(image_path)
        page = pdf[0]  # Take first page
        pil_image = page.render(scale=3).to_pil()
        new_image_path = os.path.splitext(image_path)[0] + ".jpg"
        pil_image.save(new_image_path)
        pdf.close()
        return new_image_path

    try:
        await log_manager.log("OCR Engine: converting PDF to image...", "backend")
        new_image_path = await asyncio.to_thread(_convert)
        await log_manager.log(
            f"OCR Engine: PDF converted to {new_image_path}", "backend"
        )
        return new_image_path
    except Exception as e:
        await log_manager.log(f"PDF Conversion Error: {e}", "backend")
        raise e


async def get_pdf_page_count(pdf_path: str) -> int:
    """
    Get total number of pages in a PDF using pypdfium2.

    Args:
        pdf_path: Path to PDF file

    Returns:
        Number of pages in PDF

    Raises:
        Exception: If PDF cannot be read
    """
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        page_count = len(pdf)
        pdf.close()

        await log_manager.log(f"Preprocessor: PDF has {page_count} pages", "backend")

        return page_count
    except Exception as e:
        await log_manager.log(
            f"Preprocessor: Error reading PDF page count: {e}", "backend"
        )
        raise


async def extract_pdf_page(pdf_path: str, page_number: int) -> str:
    """Extract a specific page from a PDF as an image using pypdfium2."""
    def _extract():
        pdf = pdfium.PdfDocument(pdf_path)
        if page_number < 1 or page_number > len(pdf):
            raise ValueError(
                f"Page {page_number} out of range (PDF has {len(pdf)} pages)"
            )
        page = pdf[page_number - 1]
        pil_image = page.render(scale=3).to_pil()
        base_name = os.path.splitext(pdf_path)[0]
        image_path = f"{base_name}_page{page_number:03d}.png"
        pil_image.save(image_path, "PNG")
        pdf.close()
        return image_path

    try:
        await log_manager.log(
            f"Preprocessor: Extracting page {page_number} from PDF", "backend"
        )
        image_path = await asyncio.to_thread(_extract)
        await log_manager.log(
            f"Preprocessor: Saved page {page_number} to {image_path}", "backend"
        )
        return image_path

    except Exception as e:
        await log_manager.log(
            f"Preprocessor: Error extracting page {page_number}: {e}", "backend"
        )
        raise e
