"""
Core OCR Processing Module.

This module serves as the central orchestrator for document processing.
It coordinates the preprocessing, OCR detection/recognition, and layout
analysis pipeline to extract text from images and PDFs.

Typical usage:
    from engine import core
    image_path, text, layout = await core.process_page("/path/to/document.pdf")
"""

import time
from logger import log_manager
from . import preprocessor
from . import ocr
from . import models


async def process_page(image_path: str) -> tuple[str, str, dict]:
    """Process a document page for OCR text extraction and layout analysis.

    This is the main entry point for the OCR engine. It orchestrates the
    complete processing pipeline:
    1. PDF to image conversion (if needed)
    2. Image preprocessing/cleaning
    3. Text detection and recognition via Surya OCR
    4. Layout analysis for semantic labeling

    Args:
        image_path: Absolute path to the image or PDF file to process.
            Supported formats: PDF, JPG, PNG.

    Returns:
        A tuple containing:
            - image_path (str): Path to the processed image file.
            - text (str): Full extracted text content, lines separated by newlines.
            - layout (dict): Layout analysis result containing:
                - text_lines: List of detected text lines with coordinates
                - layout_blocks: Semantic regions (Header, Text, Table, etc.)
                - width: Image width in pixels
                - height: Image height in pixels

    Raises:
        FileNotFoundError: If the image_path doesn't exist.
        ValueError: If the image cannot be decoded.

    Example:
        >>> image_path, text, layout = await process_page("uploads/doc.pdf")
        >>> print(f"Extracted {len(layout['text_lines'])} lines")
    """
    start_time = time.time()
    await log_manager.log(
        f"OCR Engine: Starting processing for {image_path}", "backend"
    )

    if (
        not models.foundation_predictor
        or not models.rec_predictor
        or not models.det_predictor
    ):
        await log_manager.log(
            "OCR Engine Warning: One or more Surya models are NOT loaded. Accuracy will be zero.",
            "backend",
        )
    else:
        await log_manager.log("OCR Engine: Surya models are ready.", "backend")

    # 0. PDF Check & Conversion
    if image_path.lower().endswith(".pdf"):
        image_path = await preprocessor.convert_pdf_to_image(image_path)

    # 1. Run OCR
    text, layout = await ocr.run_ocr(image_path)

    duration = time.time() - start_time
    await log_manager.log(
        f"OCR Engine: Total processing time: {duration:.2f} seconds.", "backend"
    )

    return image_path, text, layout
