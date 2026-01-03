import json
import os
from spellchecker import SpellChecker
from logger import log_manager
from ocr_engine import process_page


# Şimdilik language=None diyoruz çünkü Türkçe sözlük dosyasını henüz indirmedik.
# Bu sayede kod patlamaz, sadece henüz düzeltme yapmaz.
spell = SpellChecker(language=None)


async def process_ocr_and_spellcheck(file_path: str, job_id: str):
    try:
        await log_manager.log("Starting OCR processing...", "backend")
        # 1. Önce OCR yap
        clean_path, text, layout = await process_page(file_path)

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
            "clean_image": clean_path,
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
