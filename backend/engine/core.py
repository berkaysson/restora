import time
from logger import log_manager
from . import preprocessor
from . import ocr
from . import models


async def process_page(image_path: str):
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

    # 1. Clean Image
    # 1. Skip Image Cleaning (Per user request)
    clean_path = image_path
    await log_manager.log(
        f"OCR Engine: Skipping image cleaning, using original: {clean_path}", "backend"
    )

    # 2. Run OCR
    text, layout = await ocr.run_ocr(clean_path)

    duration = time.time() - start_time
    await log_manager.log(
        f"OCR Engine: Total processing time: {duration:.2f} seconds.", "backend"
    )

    return clean_path, text, layout
