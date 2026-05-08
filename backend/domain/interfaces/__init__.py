from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from domain.entities.document import Document
from domain.value_objects.ocr_result import OCRResult, LayoutData

class IDocumentRepository(ABC):
    @abstractmethod
    def save(self, document: Document) -> None:
        pass

    @abstractmethod
    def get_by_id(self, job_id: str) -> Optional[Document]:
        pass

    @abstractmethod
    def list_all(self) -> List[Document]:
        pass

    @abstractmethod
    def delete(self, job_id: str) -> None:
        pass

class IFileStorage(ABC):
    @abstractmethod
    def save_file(self, job_id: str, filename: str, content: bytes) -> str:
        pass

    @abstractmethod
    def save_json(self, job_id: str, filename: str, data: dict) -> str:
        pass

    @abstractmethod
    def get_job_directory(self, job_id: str) -> str:
        pass

    @abstractmethod
    def delete_job_directory(self, job_id: str) -> None:
        pass

class IOCREngine(ABC):
    @abstractmethod
    async def process_page(self, image_path: str) -> Tuple[str, OCRResult, LayoutData]:
        pass
