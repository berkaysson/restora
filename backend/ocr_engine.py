import cv2
import numpy as np
from PIL import Image
import pypdfium2 as pdfium
import os
import time
from logger import log_manager

# Global placeholders for models
foundation_predictor = None
rec_predictor = None
det_predictor = None

# Try to import and load Surya models safely
try:
    from surya.foundation import FoundationPredictor
    from surya.recognition import RecognitionPredictor
    from surya.detection import DetectionPredictor

    try:
        # Initialize predictors globally to load models once
        print("Loading Surya models...")
        foundation_predictor = FoundationPredictor()
        rec_predictor = RecognitionPredictor(foundation_predictor)
        det_predictor = DetectionPredictor()
        print("Surya models loaded successfully.")
    except Exception as e:
        print(f"Model loading error (GPU/CPU issue): {e}")

except ImportError:
    print("CRITICAL ERROR: 'surya-ocr' library is outdated or missing modules.")
    print("Please run: pip install --upgrade surya-ocr")


async def process_page(image_path: str):
    start_time = time.time()
    await log_manager.log(
        f"OCR Engine: Starting processing for {image_path}", "backend"
    )

    if not foundation_predictor or not rec_predictor or not det_predictor:
        await log_manager.log(
            "OCR Engine Warning: One or more Surya models are NOT loaded. Accuracy will be zero.",
            "backend",
        )
    else:
        await log_manager.log("OCR Engine: Surya models are ready.", "backend")

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
    full_text = ""
    layout_json = {}

    if rec_predictor and det_predictor:
        await log_manager.log("OCR Engine: Running Surya OCR...", "backend")

        try:
            # Run recognition with detection
            predictions = rec_predictor([pil_img], det_predictor=det_predictor)
            result = predictions[0]

            # Extract Text
            # Extract Text & Construct Custom Layout
            text_lines = []
            if hasattr(result, "text_lines"):
                full_text = "\n".join([line.text for line in result.text_lines])

                for line in result.text_lines:
                    # Convert Surya line object to our specific schema
                    # Note: We need to handle potential missing fields safely
                    chars_list = []
                    # Assuming line might have 'chars' or similar if provided by detailed OCR,
                    # but standard Surya text_prediction might just have text.
                    # If not available, we leave it empty.

                    line_data = {
                        "text": getattr(line, "text", ""),
                        "confidence": getattr(line, "confidence", 0.0),
                        "bbox": getattr(line, "bbox", [0, 0, 0, 0]),
                        "polygon": getattr(line, "polygon", []),
                        "chars": [],  # Surya typically returns lines. If chars are needed we'd need a different call or model.
                        "original_text_good": True,  # Default value
                        "words": [],  # Placeholder
                    }
                    text_lines.append(line_data)

            layout_json = {"text_lines": text_lines}

            await log_manager.log(
                f"OCR Engine: Surya OCR completed successfully. Extracted {len(full_text)} characters and {len(text_lines)} lines.",
                "backend",
            )
        except Exception as e:
            await log_manager.log(f"OCR Inference Error: {e}", "backend")
            full_text = f"OCR Error: {e}"
    else:
        error_msg = "OCR Modelleri Yüklü Değil (surya-ocr kütüphanesini güncelleyin)."
        await log_manager.log(f"OCR Engine Error: {error_msg}", "backend")
        full_text = error_msg
        layout_json = {"text_lines": [], "image_bbox": [0, 0, 0, 0]}

    duration = time.time() - start_time
    await log_manager.log(
        f"OCR Engine: Total processing time: {duration:.2f} seconds.", "backend"
    )

    return clean_path, full_text, layout_json
