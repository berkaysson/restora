from typing import Tuple
from domain.interfaces import IOCREngine
from domain.value_objects.ocr_result import OCRResult, LayoutData
from infrastructure.exceptions import OCREngineException

# Mevcut engine modülünü import ediyoruz
from engine.core import process_page as surya_process_page

class SuryaOCREngine(IOCREngine):
    """Surya kütüphanesini kullanarak IOCREngine arayüzünü uygular."""

    async def process_page(self, image_path: str) -> Tuple[str, OCRResult, LayoutData]:
        """
        Bir sayfayı OCR işleminden geçirir ve Domain nesnelerine dönüştürür.
        """
        try:
            # Mevcut engine mantığını çağırıyoruz
            # image_path (yeni path olabilir PDF ise), text, layout (dict) döner
            processed_image_path, text, layout_dict = await surya_process_page(image_path)

            # OCRResult nesnesine paketleme
            # Not: Mevcut engine confidence ve time bilgilerini layout içinde veya ayrı dönmüyor olabilir,
            # gerekirse engine/core.py'den bu veriler de alınabilir.
            ocr_result = OCRResult(
                text=text,
                confidence=0.95,  # Varsayılan veya engine'den gelen veri
                processing_time=0.0  # Engine içinde ölçülüp dönülebilir
            )

            # LayoutData nesnesine paketleme
            layout_data = LayoutData(
                width=layout_dict.get("width", 0),
                height=layout_dict.get("height", 0),
                blocks=layout_dict.get("layout_blocks", []),
                lines=layout_dict.get("text_lines", [])
            )

            return processed_image_path, ocr_result, layout_data

        except Exception as e:
            raise OCREngineException(f"OCR processing failed: {str(e)}")
