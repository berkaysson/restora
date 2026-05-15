import asyncio
import time
from typing import Dict, Any, Optional, Callable, Awaitable
from domain.interfaces import ITaskQueue
from infrastructure.exceptions import QueueException
from logger import log_manager

class AsyncProcessingQueue(ITaskQueue):
    """
    Eski queue_manager.py'deki ProcessingQueue sınıfının Clean Architecture uyumlu versiyonu.
    ITaskQueue arayüzünü implemente eder. Sayfa işleme sorumluluğunu
    dışarıdan enjekte edilen bir 'page_processor' callback'ine devreder,
    böylece Infrastructure katmanı Application katmanına bağımlı olmaz.
    """

    def __init__(
        self,
        page_processor: Callable[[str, int, str], Awaitable[None]],
        max_concurrent: int = 2
    ):
        """
        Args:
            page_processor: Her sayfa için çağrılacak async fonksiyon.
                            İmzası: async def process(job_id, page_number, file_path) -> None
            max_concurrent: Aynı anda çalışacak maksimum worker sayısı.
        """
        self.page_processor = page_processor
        self.max_concurrent = max_concurrent
        self.queue: asyncio.Queue = asyncio.Queue()
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.processing = False
        self._worker_tasks = []

    async def enqueue_page(self, job_id: str, page_number: int, file_path: str) -> None:
        """Bir sayfayı işlenmek üzere kuyruğa ekler."""
        try:
            # Job bilgisini tut
            if job_id not in self.active_jobs:
                self.active_jobs[job_id] = {"cancelled": False}

            await self.queue.put((job_id, page_number, file_path))
            await log_manager.log(
                f"Queue: Enqueued page {page_number} for job {job_id}", "backend"
            )
        except Exception as e:
            raise QueueException(f"Failed to enqueue page: {e}") from e

    async def cancel_job(self, job_id: str) -> None:
        """Aktif bir işi iptal eder. Kuyrukta bekleyen sayfalar atlanır."""
        if job_id in self.active_jobs:
            self.active_jobs[job_id]["cancelled"] = True
            await log_manager.log(f"Queue: Job {job_id} marked for cancellation", "backend")

    async def start(self) -> None:
        """Kuyruk worker'larını başlatır."""
        self.processing = True
        await log_manager.log(
            f"Queue: Starting {self.max_concurrent} concurrent workers", "backend"
        )
        self._worker_tasks = [
            asyncio.create_task(self._worker(i))
            for i in range(self.max_concurrent)
        ]

    async def stop(self) -> None:
        """Kuyruk worker'larını durdurur."""
        self.processing = False
        for task in self._worker_tasks:
            task.cancel()
        self._worker_tasks = []
        await log_manager.log("Queue: Workers stopped", "backend")

    async def _worker(self, worker_id: int) -> None:
        """Kuyruktan iş alıp page_processor callback'ini çağıran worker."""
        await log_manager.log(f"Queue: Worker {worker_id} started", "backend")

        while self.processing:
            try:
                job_id, page_number, file_path = await asyncio.wait_for(
                    self.queue.get(), timeout=5.0
                )

                # İptal kontrolü
                if self.active_jobs.get(job_id, {}).get("cancelled"):
                    await log_manager.log(
                        f"Queue: Skipping page {page_number} of cancelled job {job_id}",
                        "backend"
                    )
                    self.queue.task_done()
                    continue

                await log_manager.log(
                    f"Queue: Worker {worker_id} processing page {page_number} of job {job_id}",
                    "backend"
                )

                # Sayfa işlemeyi Application katmanına devret
                await self.page_processor(job_id, page_number, file_path)
                self.queue.task_done()

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                await log_manager.log(
                    f"Queue: Worker {worker_id} error: {e}", "backend"
                )
