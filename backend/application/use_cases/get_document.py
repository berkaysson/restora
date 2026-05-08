from typing import Optional
from domain.interfaces import IDocumentRepository
from application.dto.document_dto import DocumentDTO

class GetDocumentUseCase:
    """Belirli bir dokümanın detaylarını getirir."""

    def __init__(self, repository: IDocumentRepository):
        self.repository = repository

    async def execute(self, job_id: str) -> Optional[DocumentDTO]:
        document = self.repository.get_by_id(job_id)
        if not document:
            return None
        
        return DocumentDTO.model_validate(document)
