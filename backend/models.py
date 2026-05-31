from pydantic import BaseModel
from typing import Optional
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    DEAD = "dead"           # exhausted all retries → sent to DLQ


class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Task(BaseModel):
    id: str
    name: str
    payload: dict
    status: TaskStatus = TaskStatus.PENDING
    priority: Priority = Priority.MEDIUM
    max_retries: int = 3
    retry_count: int = 0
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str