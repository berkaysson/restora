from dataclasses import dataclass

@dataclass(frozen=True)
class ExternalLog:
    """Value object representing an external log entry.

    Ensures that log entries have non-empty message content and valid sources.
    """
    message: str
    source: str = "backend"

    def __post_init__(self):
        if not self.message or not isinstance(self.message, str) or not self.message.strip():
            raise ValueError("Log message cannot be empty")
        if self.source not in ("backend", "system", "frontend"):
            raise ValueError("Log source must be one of 'backend', 'system', or 'frontend'")
