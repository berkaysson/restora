from pydantic import BaseModel

class ProcessDocumentRequest(BaseModel):
    """Doküman işleme isteği için DTO."""
    job_id: str
