"""
Image Preprocessing Module.

This module handles file preprocessing before OCR analysis:
- PDF to image conversion using pypdfium2
- Image cleaning and enhancement using OpenCV

Note:
    Aggressive image cleaning (binarization) is currently disabled
    as modern OCR models like Surya perform better with grayscale input.
"""

import cv2
import numpy as np
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


async def clean_image(image_path: str) -> str:
    """Clean and preprocess an image for optimal OCR results.

    Performs image enhancement using OpenCV:
    1. Loads image with Unicode path support
    2. Converts to grayscale
    3. Saves the processed image

    Note:
        Aggressive binarization (adaptive threshold) is currently disabled
        as modern OCR models handle grayscale better than binary images.

    Args:
        image_path: Path to the source image file.

    Returns:
        Path to the cleaned image file, with '_clean' suffix added
        to the original filename.

    Raises:
        ValueError: If the image cannot be decoded.

    Example:
        >>> clean_path = await clean_image("uploads/scan.jpg")
        >>> print(clean_path)  # "uploads/scan_clean.jpg"
    """
    # OpenCV Image Cleaning
    try:
        img_bytes = np.fromfile(image_path, dtype=np.uint8)
        img = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Image decode failed")

        height, width, channels = img.shape
        await log_manager.log(
            f"OCR Engine: Image loaded. Resolution: {width}x{height}, Channels: {channels}",
            "backend",
        )
    except Exception as e:
        error_msg = f"Görüntü okunamadı: {image_path}. Hata: {e}"
        await log_manager.log(f"OCR Engine Error: {error_msg}", "backend")
        raise ValueError(error_msg)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Skip aggressive cleaning (adaptive threshold) to avoid adding noise/dots
    # Modern OCR models like Surya handle grayscale better than binary
    clean_img = gray

    clean_path = image_path.replace(".jpg", "_clean.jpg").replace(
        ".png", "_clean.jpg"
    )  # Uzantı desteği

    # cv2.imwrite yerine Unicode destekli kayıt:
    _, buffer = cv2.imencode(".jpg", clean_img)
    buffer.tofile(clean_path)

    await log_manager.log(
        f"OCR Engine: OpenCV cleaning completed. Saved to {clean_path}", "backend"
    )
    return clean_path
