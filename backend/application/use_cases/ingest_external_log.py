from domain.interfaces import ILogger
from domain.value_objects.external_log import ExternalLog

class IngestExternalLogUseCase:
    """Orchestrates ingestion and broadcasting of external log entries."""

    def __init__(self, logger: ILogger):
        self.logger = logger

    async def execute(self, external_log: ExternalLog) -> bool:
        """Executes the log ingestion workflow, sending the log to the injected logger.

        Handles any unexpected exceptions to guarantee fault tolerance.
        """
        try:
            await self.logger.log(external_log.message, external_log.source)
            return True
        except Exception:
            # Fault tolerance: log propagation failure should not crash the main runtime flow.
            return False
