import cv2
import numpy as np
import pypdfium2 as pdfium
import os
from logger import log_manager


async def convert_pdf_to_image(image_path: str):
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


async def clean_image(image_path: str):
    # 1. OpenCV Temizlik (Adaptive Threshold)
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
