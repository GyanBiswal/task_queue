import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# NOTE: Swapped 'queue' out for your real tracking file 'task_queue'
from task_queue import push_task, get_task, get_all_tasks, get_dlq_tasks

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
    priority: str = "medium"      # "high" | "medium" | "low"
    max_retries: int = 3


@app.post("/tasks", status_code=201)
def submit_task(req: TaskRequest):
    if req.priority not in ("high", "medium", "low"):
        raise HTTPException(status_code=400, detail="Priority must be 'high', 'medium', or 'low'")

    task_id = str(uuid.uuid4())
    now     = datetime.now(timezone.utc).isoformat()

    task = {
        "id":          task_id,
        "name":        req.name,
        "payload":     req.payload,
        "status":      "pending",
        "priority":    req.priority,
        "max_retries": req.max_retries,
        "retry_count": 0,
        "result":      None,
        "error":       None,
        "created_at":  now,
        "updated_at":  now,
    }

    push_task(task)
    return {"task_id": task_id, "status": "pending", "priority": req.priority}


@app.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.get("/tasks")
def list_all_tasks():
    """Returns all tasks — used by the dashboard."""
    return get_all_tasks()


@app.get("/dlq")
def list_dlq():
    """Returns all dead-lettered tasks."""
    return get_dlq_tasks()