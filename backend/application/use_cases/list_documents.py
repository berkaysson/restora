from typing import List
from domain.interfaces import IDocumentRepository
from application.dto.document_dto import DocumentDTO

class ListDocumentsUseCase:
    """Sistemdeki tüm dokümanları listeler."""

    def __init__(self, repository: IDocumentRepository):
        self.repository = repository

    async def execute(self) -> List[DocumentDTO]:
        documents = self.repository.list_all()
        return [DocumentDTO.from_document(doc) for doc in documents]
