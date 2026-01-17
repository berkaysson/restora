from PIL import Image
from logger import log_manager
from . import models


async def run_ocr(image_path: str):
    pil_img = Image.open(image_path)
    full_text = ""
    layout_json = {}

    if models.rec_predictor and models.det_predictor:
        await log_manager.log("OCR Engine: Running Surya OCR...", "backend")

        try:
            # Run recognition with detection
            predictions = models.rec_predictor(
                [pil_img], det_predictor=models.det_predictor
            )
            result = predictions[0]

            # Extract Text & Construct Custom Layout
            text_lines = []
            if hasattr(result, "text_lines"):
                full_text = "\n".join([line.text for line in result.text_lines])

                for line in result.text_lines:
                    # Convert Surya line object to our specific schema
                    line_data = {
                        "text": getattr(line, "text", ""),
                        "confidence": getattr(line, "confidence", 0.0),
                        "bbox": getattr(line, "bbox", [0, 0, 0, 0]),
                        "polygon": getattr(line, "polygon", []),
                        "chars": [],
                        "original_text_good": True,
                        "words": [],
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

    return full_text, layout_json
