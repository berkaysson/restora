from pydantic import BaseModel, Field
from domain.value_objects.external_log import ExternalLog

class ExternalLogDTO(BaseModel):
    """DTO for validating incoming external log HTTP requests."""
    message: str = Field(..., description="The log message content")
    source: str = Field("backend", description="The origin of the log (backend, system, or frontend)")

    def to_domain(self) -> ExternalLog:
        """Converts DTO to domain Value Object."""
        return ExternalLog(message=self.message, source=self.source)
