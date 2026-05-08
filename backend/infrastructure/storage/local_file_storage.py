import os
import json
import shutil
from pathlib import Path
from domain.interfaces import IFileStorage
from infrastructure.exceptions import InfrastructureException

class LocalFileStorage(IFileStorage):
    """Yerel dosya sistemini kullanarak IFileStorage arayüzünü uygular."""

    def __init__(self, base_dir: str = "uploads"):
        self.base_dir = Path(base_dir)
        self._ensure_base_dir()

    def _ensure_base_dir(self):
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise InfrastructureException(f"Base directory creation failed: {e}")

    def save_file(self, job_id: str, filename: str, content: bytes) -> str:
        job_dir = self.base_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = job_dir / filename
        try:
            with open(file_path, "wb") as f:
                f.write(content)
            return str(file_path)
        except Exception as e:
            raise InfrastructureException(f"File save failed: {e}")

    def save_json(self, job_id: str, filename: str, data: dict) -> str:
        job_dir = self.base_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = job_dir / filename
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return str(file_path)
        except Exception as e:
            raise InfrastructureException(f"JSON save failed: {e}")

    def get_job_directory(self, job_id: str) -> str:
        job_dir = self.base_dir / job_id
        if not job_dir.exists():
            job_dir.mkdir(parents=True, exist_ok=True)
        return str(job_dir)

    def delete_job_directory(self, job_id: str) -> None:
        job_dir = self.base_dir / job_id
        if job_dir.exists() and job_dir.is_dir():
            try:
                shutil.rmtree(job_dir)
            except Exception as e:
                raise InfrastructureException(f"Directory deletion failed: {e}")
