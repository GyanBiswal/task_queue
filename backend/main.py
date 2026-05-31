import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# FIX: Sourced cleanly from 'task_queue' to avoid local module naming collisions
from task_queue import push_task, get_task, get_all_tasks, get_dlq_tasks, get_scheduled_tasks

app = FastAPI(title="Distributed Task Queue")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TaskRequest(BaseModel):
    name: str
    payload: dict = {}
    priority: str = "medium"       # "high" | "medium" | "low"
    max_retries: int = 3
    delay_seconds: Optional[int] = None  # Run N seconds from now
    run_at: Optional[str] = None         # Target execution window (ISO timestamp string)


@app.post("/tasks", status_code=201)
def submit_task(req: TaskRequest):
    if req.priority not in ("high", "medium", "low"):
        raise HTTPException(status_code=400, detail="Priority must be 'high', 'medium', or 'low'")

    task_id = str(uuid.uuid4())
    now     = datetime.now(timezone.utc)

    # Resolve run_at — delay_seconds takes precedence over an explicit run_at string
    run_at = None
    if req.delay_seconds and req.delay_seconds > 0:
        run_at = (now + timedelta(seconds=req.delay_seconds)).isoformat()
    elif req.run_at:
        run_at = req.run_at

    # State Machine Integration: Future-dated actions initialization routing
    status = "scheduled" if run_at else "pending"

    task = {
        "id":          task_id,
        "name":        req.name,
        "payload":     req.payload,
        "status":      status,
        "priority":    req.priority,
        "max_retries": req.max_retries,
        "retry_count": 0,
        "run_at":      run_at,
        "result":      None,
        "error":       None,
        "created_at":  now.isoformat(),
        "updated_at":  now.isoformat(),
    }

    push_task(task)
    return {"task_id": task_id, "status": status, "priority": req.priority, "run_at": run_at}


@app.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.get("/tasks")
def list_all_tasks():
    """Returns all tracked metadata hashes stored in the cluster cluster."""
    return get_all_tasks()


@app.get("/dlq")
def list_dlq():
    """Returns all dead-lettered tasks that fully exhausted execution boundaries."""
    return get_dlq_tasks()


@app.get("/scheduled")
def list_scheduled():
    """Returns all tasks currently waiting in the Sorted Set buffer for their run_at window."""
    return get_scheduled_tasks()