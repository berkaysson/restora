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

            # Run Layout Analysis
            layout_blocks = []
            if models.layout_predictor:
                try:
                    layout_preds = models.layout_predictor([pil_img])
                    l_result = layout_preds[0]
                    # Surya Layout returns 'bboxes' attribute for blocks
                    for block in getattr(l_result, "bboxes", []):
                        layout_blocks.append(
                            {
                                "label": block.label,
                                "confidence": getattr(block, "confidence", 1.0),
                                "bbox": block.bbox,
                                "polygon": block.polygon,
                            }
                        )
                except Exception as e:
                    await log_manager.log(f"Layout Inference Error: {e}", "backend")

            # Extract Text & Construct Custom Layout
            text_lines = []
            if hasattr(result, "text_lines"):
                full_text = "\n".join([line.text for line in result.text_lines])

                for line in result.text_lines:
                    # Convert Surya line object to our specific schema
                    line_bbox = getattr(line, "bbox", [0, 0, 0, 0])

                    # Determine layout labels for this line
                    assigned_labels = []
                    cx = (line_bbox[0] + line_bbox[2]) / 2
                    cy = (line_bbox[1] + line_bbox[3]) / 2

                    for lb in layout_blocks:
                        l_bbox = lb["bbox"]
                        # Check if line center is inside layout block
                        if (
                            l_bbox[0] <= cx <= l_bbox[2]
                            and l_bbox[1] <= cy <= l_bbox[3]
                        ):
                            assigned_labels.append(lb["label"])

                    line_data = {
                        "text": getattr(line, "text", ""),
                        "confidence": getattr(line, "confidence", 0.0),
                        "bbox": line_bbox,
                        "polygon": getattr(line, "polygon", []),
                        "chars": [],
                        "original_text_good": True,
                        "words": [],
                        "layout_labels": assigned_labels,
                    }
                    text_lines.append(line_data)

            layout_json = {"text_lines": text_lines, "layout_blocks": layout_blocks}

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
