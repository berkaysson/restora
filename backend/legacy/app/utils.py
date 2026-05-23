"""
OCR Processing Utilities.

This module provides helper functions for the OCR workflow,
including text processing and spellchecking functionality.
"""

import json
import os
from spellchecker import SpellChecker
from logger import log_manager
from app.schemas import OCRResponse
from ocr_engine import process_page


# SpellChecker instance for typo detection
# Note: language=None disables dictionary-based checking until Turkish dict is added
spell = SpellChecker(language=None)


async def process_ocr_and_spellcheck(file_path: str, job_id: str) -> OCRResponse:
    """Process a file through OCR and perform spellcheck analysis.

    This is the main processing pipeline that:
    1. Runs OCR on the uploaded file
    2. Analyzes extracted text for potential typos
    3. Saves results to a JSON file
    4. Returns the complete result object

    Args:
        file_path: Absolute path to the file to process (PDF or image).
        job_id: Unique identifier for this processing job.

    Returns:
        Dictionary containing:
            - status: "success" or "error"
            - job_id: The processing job identifier
            - image_path: Path to the processed image
            - text: Full extracted text content
            - layout: Layout analysis with text_lines and layout_blocks
            - typos: List of potentially misspelled words

    Note:
        Results are also saved to 'results.json' in the job directory.

    Example:
        >>> result = await process_ocr_and_spellcheck("uploads/123/doc.pdf", "123")
        >>> if result["status"] == "success":
        ...     print(f"Found {len(result['typos'])} typos")
    """
    try:
        await log_manager.log("Starting OCR processing...", "backend")
        # 1. Önce OCR yap
        image_path, text, layout = await process_page(file_path)

        await log_manager.log("OCR completed. Analysing text...", "backend")
        # OCR'dan çıkan metni kelimelere böl
        words = text.split()

        # Bilinmeyen (hatalı olma ihtimali olan) kelimeleri bul
        misspelled = spell.unknown(words)

        # Set kümesini listeye çevir (JSON serileştirme hatası almamak için)
        typos_list = list(misspelled)

        await log_manager.log(
            f"Analysis complete. Found {len(typos_list)} potential typos in {len(words)} words.",
            "backend",
        )

        result_data = {
            "status": "success",
            "job_id": job_id,
            "image_path": image_path,
            "text": text,
            "layout": layout,
            "typos": typos_list,
        }

        # Sonuçları JSON olarak kaydet
        json_path = os.path.join(os.path.dirname(file_path), "results.json")
        try:
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(result_data, f, ensure_ascii=False, indent=4)
            await log_manager.log(f"Results saved to JSON: {json_path}", "backend")
        except Exception as e:
            await log_manager.log(f"Error saving JSON: {e}", "backend")

        return result_data

    except Exception as e:
        await log_manager.log(f"Error during processing: {str(e)}", "backend")
        return {"status": "error", "message": str(e)}
