import asyncio
import time
from typing import Dict, Any, Optional, Callable, Awaitable
from domain.interfaces import ITaskQueue
from infrastructure.exceptions import QueueException
from logger import log_manager


class AsyncProcessingQueue(ITaskQueue):
    """
    ITaskQueue arayüzünü implemente eder. Sayfa işleme sorumluluğunu
    dışarıdan enjekte edilen bir 'page_processor' callback'ine devreder,
    böylece Infrastructure katmanı Application katmanına bağımlı olmaz.
    """

    def __init__(
        self,
        page_processor: Callable[[str, int, str], Awaitable[None]],
        max_concurrent: int = 2,
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
        self._running_tasks: Dict[str, set] = {}

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
        """Aktif bir işi iptal eder. Kuyrukta bekleyen sayfalar atlanır ve çalışan task'lar iptal edilir."""
        if job_id in self.active_jobs:
            self.active_jobs[job_id]["cancelled"] = True
            await log_manager.log(
                f"Queue: Job {job_id} marked for cancellation", "backend"
            )

            # 1. Kuyruktaki bu job'a ait elemanları temizle
            temp_list = []
            while not self.queue.empty():
                try:
                    item = self.queue.get_nowait()
                    if item[0] != job_id:
                        temp_list.append(item)
                    else:
                        self.queue.task_done()
                except asyncio.QueueEmpty:
                    break

            for item in temp_list:
                await self.queue.put(item)

            # 2. Çalışan task'ları iptal et
            if job_id in self._running_tasks:
                for task in list(self._running_tasks[job_id]):
                    task.cancel()
                await log_manager.log(
                    f"Queue: Cancelled running subtasks for job {job_id}", "backend"
                )

    async def start(self) -> None:
        """Kuyruk worker'larını başlatır."""
        self.processing = True
        await log_manager.log(
            f"Queue: Starting {self.max_concurrent} concurrent workers", "backend"
        )
        self._worker_tasks = [
            asyncio.create_task(self._worker(i)) for i in range(self.max_concurrent)
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
                        "backend",
                    )
                    self.queue.task_done()
                    continue

                await log_manager.log(
                    f"Queue: Worker {worker_id} processing page {page_number} of job {job_id}",
                    "backend",
                )

                # Sayfa işlemeyi Application katmanına devret
                task = asyncio.create_task(self.page_processor(job_id, page_number, file_path))
                
                if job_id not in self._running_tasks:
                    self._running_tasks[job_id] = set()
                self._running_tasks[job_id].add(task)

                try:
                    await task
                except asyncio.CancelledError:
                    if not self.processing:
                        raise
                    await log_manager.log(
                        f"Queue: Worker {worker_id} - Processing page {page_number} for job {job_id} was cancelled.",
                        "backend",
                    )
                finally:
                    if job_id in self._running_tasks and task in self._running_tasks[job_id]:
                        self._running_tasks[job_id].remove(task)
                        if not self._running_tasks[job_id]:
                            del self._running_tasks[job_id]
                    self.queue.task_done()

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                await log_manager.log(
                    f"Queue: Worker {worker_id} error: {e}", "backend"
                )
