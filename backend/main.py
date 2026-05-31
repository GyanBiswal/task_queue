import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from task_queue import push_task, get_task

app = FastAPI(title="Distributed Task Queue")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TaskRequest(BaseModel):
    name: str           # e.g. "send_email", "generate_report"
    payload: dict = {}  # arbitrary data the worker needs


@app.post("/tasks", status_code=201)
def submit_task(req: TaskRequest):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    task = {
        "id": task_id,
        "name": req.name,
        "payload": req.payload,
        "status": "pending",
        "result": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }

    push_task(task)
    return {"task_id": task_id, "status": "pending"}


@app.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task