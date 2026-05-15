from fastapi import Depends
from infrastructure.database.sqlite_document_repository import SqliteDocumentRepository
from infrastructure.storage.local_file_storage import LocalFileStorage
from infrastructure.queue.async_processing_queue import AsyncProcessingQueue
from infrastructure.notifications.websocket_notification_service import WebSocketNotificationService
from infrastructure.ocr.surya_ocr_engine import SuryaOCREngine
from application.use_cases.upload_document import UploadDocumentUseCase
from application.use_cases.process_document import ProcessDocumentUseCase
from application.use_cases.process_page import ProcessPageUseCase
from application.use_cases.reprocess_document import ReprocessDocumentUseCase
from application.use_cases.list_documents import ListDocumentsUseCase
from application.use_cases.get_document import GetDocumentUseCase
from application.use_cases.delete_document import DeleteDocumentUseCase

# Singletons
_repository_instance = None
_storage_instance = None
_task_queue_instance = None
_notification_service_instance = None
_ocr_engine_instance = None

def get_repository() -> SqliteDocumentRepository:
    global _repository_instance
    if _repository_instance is None:
        _repository_instance = SqliteDocumentRepository()
    return _repository_instance

def get_storage() -> LocalFileStorage:
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalFileStorage(base_dir="uploads")
    return _storage_instance

def get_notification_service() -> WebSocketNotificationService:
    global _notification_service_instance
    if _notification_service_instance is None:
        _notification_service_instance = WebSocketNotificationService()
    return _notification_service_instance

def get_ocr_engine() -> SuryaOCREngine:
    global _ocr_engine_instance
    if _ocr_engine_instance is None:
        _ocr_engine_instance = SuryaOCREngine()
    return _ocr_engine_instance

def get_task_queue() -> AsyncProcessingQueue:
    global _task_queue_instance
    if _task_queue_instance is None:
        async def process_page_callback(job_id: str, page_number: int, file_path: str):
            # Create use case dynamically to avoid circular dependencies during initialization
            use_case = ProcessPageUseCase(
                repository=get_repository(),
                storage=get_storage(),
                ocr_engine=get_ocr_engine(),
                notification_service=get_notification_service()
            )
            await use_case.execute(job_id, page_number, file_path)
            
        _task_queue_instance = AsyncProcessingQueue(page_processor=process_page_callback)
    return _task_queue_instance


# Use Case factory functions
def get_upload_use_case(
    repository: SqliteDocumentRepository = Depends(get_repository),
    storage: LocalFileStorage = Depends(get_storage),
    task_queue: AsyncProcessingQueue = Depends(get_task_queue)
) -> UploadDocumentUseCase:
    return UploadDocumentUseCase(repository, storage, task_queue)

def get_process_document_use_case(
    repository: SqliteDocumentRepository = Depends(get_repository),
    storage: LocalFileStorage = Depends(get_storage),
    ocr_engine: SuryaOCREngine = Depends(get_ocr_engine)
) -> ProcessDocumentUseCase:
    return ProcessDocumentUseCase(repository, storage, ocr_engine)

def get_process_page_use_case(
    repository: SqliteDocumentRepository = Depends(get_repository),
    storage: LocalFileStorage = Depends(get_storage),
    ocr_engine: SuryaOCREngine = Depends(get_ocr_engine),
    notification_service: WebSocketNotificationService = Depends(get_notification_service)
) -> ProcessPageUseCase:
    return ProcessPageUseCase(repository, storage, ocr_engine, notification_service)

def get_reprocess_document_use_case(
    repository: SqliteDocumentRepository = Depends(get_repository),
    storage: LocalFileStorage = Depends(get_storage),
    task_queue: AsyncProcessingQueue = Depends(get_task_queue)
) -> ReprocessDocumentUseCase:
    return ReprocessDocumentUseCase(repository, storage, task_queue)

def get_list_documents_use_case(
    repository: SqliteDocumentRepository = Depends(get_repository)
) -> ListDocumentsUseCase:
    return ListDocumentsUseCase(repository)

def get_get_document_use_case(
    repository: SqliteDocumentRepository = Depends(get_repository)
) -> GetDocumentUseCase:
    return GetDocumentUseCase(repository)

def get_delete_document_use_case(
    repository: SqliteDocumentRepository = Depends(get_repository),
    storage: LocalFileStorage = Depends(get_storage),
    task_queue: AsyncProcessingQueue = Depends(get_task_queue)
) -> DeleteDocumentUseCase:
    return DeleteDocumentUseCase(repository, storage, task_queue)
