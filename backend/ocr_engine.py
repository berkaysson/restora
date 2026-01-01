import cv2
import numpy as np
from surya.ocr import run_ocr
from surya.model.detection import segformer
from surya.model.recognition.model import load_model
from surya.model.recognition.processor import load_processor
from PIL import Image
import pypdfium2 as pdfium
import os

# Modelleri GPU'ya yükle (Global)
try:
    det_processor, det_model = segformer.load_processor(), segformer.load_model()
    rec_model, rec_processor = load_model(), load_processor()
except Exception as e:
    print(f"Model yükleme hatası (GPU/CPU sorunu olabilir): {e}")
    # Fallback or exit logic could go here
    det_processor, det_model = None, None
    rec_model, rec_processor = None, None

from logger import log_manager


async def process_page(image_path: str):
    await log_manager.log(
        f"OCR Engine: Starting processing for {image_path}", "backend"
    )

    # 0. PDF Check & Conversion
    if image_path.lower().endswith(".pdf"):
        try:
            await log_manager.log("OCR Engine: converting PDF to image...", "backend")
            pdf = pdfium.PdfDocument(image_path)
            page = pdf[0]  # Take first page
            pil_image = page.render(
                scale=3
            ).to_pil()  # scale 3 = 216 dpi approx, good for OCR

            # Save as temp image
            image_path = os.path.splitext(image_path)[0] + ".jpg"
            pil_image.save(image_path)
            await log_manager.log(
                f"OCR Engine: PDF converted to {image_path}", "backend"
            )
        except Exception as e:
            await log_manager.log(f"PDF Conversion Error: {e}", "backend")
            raise e

    # 1. OpenCV Temizlik (Adaptive Threshold)
    # cv2.imread non-ASCII path'lerde (Türkçe karakterler) hata verebiliyor.
    # Bu yüzden dosyayı numpy ile okuyup decode ediyoruz.
    img = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)

    if img is None:
        error_msg = f"Görüntü okunamadı: {image_path}"
        await log_manager.log(f"OCR Engine Error: {error_msg}", "backend")
        raise ValueError(error_msg)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Gürültü silme ve netleştirme
    clean_img = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    clean_path = image_path.replace(".jpg", "_clean.jpg").replace(
        ".png", "_clean.jpg"
    )  # Uzantı desteği

    # cv2.imwrite yerine Unicode destekli kayıt:
    _, buffer = cv2.imencode(".jpg", clean_img)
    buffer.tofile(clean_path)

    await log_manager.log(
        f"OCR Engine: OpenCV cleaning completed. Saved to {clean_path}", "backend"
    )

    # 2. Surya OCR
    pil_img = Image.open(clean_path)

    if det_model and rec_model:
        await log_manager.log("OCR Engine: Running Surya OCR...", "backend")
        # 2060S için batch size'ı zorlama, tek tek işle veya küçük gruplar
        predictions = run_ocr(
            [pil_img], [[]], det_model, det_processor, rec_model, rec_processor
        )
        result = predictions[0]

        # Text ve Layout verisini döndür
        full_text = "\n".join([l.text_content for l in result.text_lines])
        layout_json = result.json()  # Koordinatları içerir
        await log_manager.log(
            "OCR Engine: Surya OCR completed successfully.", "backend"
        )
    else:
        error_msg = "OCR Modelleri Yüklenemedi"
        await log_manager.log(f"OCR Engine Error: {error_msg}", "backend")
        full_text = error_msg
        layout_json = {"text_lines": [], "image_bbox": [0, 0, 0, 0]}  # Dummy data

    return clean_path, full_text, layout_json
