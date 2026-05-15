import os
import json
import shutil
from pathlib import Path
from domain.interfaces import IFileStorage
from infrastructure.exceptions import InfrastructureException


class LocalFileStorage(IFileStorage):
    """Yerel dosya sistemini kullanarak IFileStorage arayüzünü uygular.

    Klasör yapısı eski storage_manager.py ile birebir uyumludur:
        uploads/
        └── {job_id}/
            ├── {filename}            ← Yüklenen orijinal dosya
            └── pages/
                ├── page_001.png      ← Çıkartılan sayfa resimleri
                └── page_001_ocr.json ← OCR sonuçları
    """

    def __init__(self, base_dir: str = "uploads"):
        self.base_dir = Path(base_dir)
        self._ensure_base_dir()

    def _ensure_base_dir(self):
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise InfrastructureException(f"Base directory creation failed: {e}")

    # ------------------------------------------------------------------
    # IFileStorage zorunlu metodları
    # ------------------------------------------------------------------

    def save_file(self, job_id: str, filename: str, content: bytes) -> str:
        """Dosyayı job klasörüne kaydeder; pages/ alt klasörünü de garantiye alır."""
        job_dir = self.base_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        # pages/ alt klasörünü hemen oluştur — OCR işleminde hazır olsun
        (job_dir / "pages").mkdir(exist_ok=True)

        file_path = job_dir / filename
        try:
            with open(file_path, "wb") as f:
                f.write(content)
            return str(file_path)
        except Exception as e:
            raise InfrastructureException(f"File save failed: {e}")

    def save_json(self, job_id: str, filename: str, data: dict) -> str:
        """JSON verisini kaydeder.
        
        filename alt klasör içerebilir (örn. 'pages/page_001_ocr.json').
        Gerekli klasörler otomatik oluşturulur.
        """
        file_path = self.base_dir / job_id / filename
        try:
            # Alt klasörleri (örn. pages/) otomatik oluştur
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return str(file_path)
        except Exception as e:
            raise InfrastructureException(f"JSON save failed: {e}")

    def get_job_directory(self, job_id: str) -> str:
        """Job kök klasörünün yolunu döner, yoksa oluşturur."""
        job_dir = self.base_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return str(job_dir)

    def delete_job_directory(self, job_id: str) -> None:
        """Job klasörünü ve içindeki tüm dosyaları siler."""
        job_dir = self.base_dir / job_id
        if job_dir.exists() and job_dir.is_dir():
            try:
                shutil.rmtree(job_dir)
            except Exception as e:
                raise InfrastructureException(f"Directory deletion failed: {e}")

    # ------------------------------------------------------------------
    # Yardımcı metodlar (eski storage_manager API'si ile uyumlu)
    # ------------------------------------------------------------------

    def get_pages_directory(self, job_id: str) -> str:
        """pages/ alt klasörünün yolunu döner, yoksa oluşturur."""
        pages_dir = self.base_dir / job_id / "pages"
        pages_dir.mkdir(parents=True, exist_ok=True)
        return str(pages_dir)

    def get_page_image_path(self, job_id: str, page_number: int) -> str:
        """Sayfa resminin kalıcı yolunu döner: uploads/{job_id}/pages/page_001.png"""
        return str(self.base_dir / job_id / "pages" / f"page_{page_number:03d}.png")

    def get_page_ocr_path(self, job_id: str, page_number: int) -> str:
        """Sayfa OCR JSON dosyasının yolunu döner: uploads/{job_id}/pages/page_001_ocr.json"""
        return str(self.base_dir / job_id / "pages" / f"page_{page_number:03d}_ocr.json")
