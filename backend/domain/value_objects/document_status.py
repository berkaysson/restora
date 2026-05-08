from enum import Enum

class DocumentStatus(Enum):
    """Doküman ve sayfa işleme durumlarını temsil eden Enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
