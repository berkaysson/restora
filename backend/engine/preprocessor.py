"""
Image Preprocessing Module.

This module handles file preprocessing before OCR analysis:
- PDF to image conversion using pypdfium2
"""

import pypdfium2 as pdfium
import os
from logger import log_manager


async def convert_pdf_to_image(image_path: str) -> str:
    """Convert a PDF file to a high-resolution JPG image.

    Renders the first page of a PDF document to an image suitable for
    OCR processing. Uses a scale factor of 3 (~216 DPI) which provides
    a good balance between quality and processing speed.

    Args:
        image_path: Path to the PDF file to convert.

    Returns:
        Path to the converted JPG image. The output file is saved in
        the same directory with the same name but .jpg extension.

    Raises:
        Exception: If PDF cannot be opened or rendered.

    Example:
        >>> jpg_path = await convert_pdf_to_image("uploads/doc.pdf")
        >>> print(jpg_path)  # "uploads/doc.jpg"
    """
    try:
        await log_manager.log("OCR Engine: converting PDF to image...", "backend")
        pdf = pdfium.PdfDocument(image_path)
        page = pdf[0]  # Take first page
        pil_image = page.render(
            scale=3
        ).to_pil()  # scale 3 = 216 dpi approx, good for OCR

        # Save as temp image
        new_image_path = os.path.splitext(image_path)[0] + ".jpg"
        pil_image.save(new_image_path)
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
    """
    Extract a specific page from a PDF as an image using pypdfium2.

    Args:
        pdf_path: Path to PDF file
        page_number: Page number to extract (1-indexed)

    Returns:
        Path to extracted page image

    Raises:
        Exception: If page extraction fails
    """
    try:
        await log_manager.log(
            f"Preprocessor: Extracting page {page_number} from PDF", "backend"
        )

        pdf = pdfium.PdfDocument(pdf_path)

        # Check if page exists (pypdfium2 uses 0-indexed)
        if page_number < 1 or page_number > len(pdf):
            raise ValueError(
                f"Page {page_number} out of range (PDF has {len(pdf)} pages)"
            )

        # Get the page (convert to 0-indexed)
        page = pdf[page_number - 1]

        # Render page to image (scale=3 for ~216 DPI)
        pil_image = page.render(scale=3).to_pil()

        # Save the page
        base_name = os.path.splitext(pdf_path)[0]
        image_path = f"{base_name}_page{page_number:03d}.png"
        pil_image.save(image_path, "PNG")

        # Close PDF
        pdf.close()

        await log_manager.log(
            f"Preprocessor: Saved page {page_number} to {image_path}", "backend"
        )

        return image_path

    except Exception as e:
        await log_manager.log(
            f"Preprocessor: Error extracting page {page_number}: {e}", "backend"
        )
        raise
