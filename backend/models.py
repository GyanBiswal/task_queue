from enum import Enum
from typing import Optional
from pydantic import BaseModel


class TaskStatus(str, Enum):
    SCHEDULED = "scheduled"   # Waiting for run_at timestamp to pass
    PENDING   = "pending"     # Ready in queue for immediate pickup
    RUNNING   = "running"     # Actively being processed by a worker node
    DONE      = "done"        # Finished successfully
    FAILED    = "failed"      # Temporary error state before retry logic kicks in
    DEAD      = "dead"        # Exhausted all retries -> Moved to Dead Letter Queue (DLQ)


class Priority(str, Enum):
    HIGH   = "high"
    MEDIUM = "medium"
    LOW    = "low"


class Task(BaseModel):
    id: str
    name: str
    payload: dict
    status: TaskStatus = TaskStatus.PENDING
    priority: Priority = Priority.MEDIUM
    max_retries: int = 3
    retry_count: int = 0
    run_at: Optional[str] = None   # ISO timestamp string. None indicates immediate processing.
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str