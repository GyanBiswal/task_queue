import redis
import json
import os
from dotenv import load_dotenv

load_dotenv()

# ── Key constants ─────────────────────────────────────────────────────────────
TASK_PREFIX = "task:"             # Redis hash prefix for task metadata
DLQ_KEY = "queue:dead"            # Dead Letter Queue — tasks that exhausted retries

# Three separate Redis lists — one per priority level.
QUEUES = {
    "high":   "queue:high",
    "medium": "queue:medium",
    "low":    "queue:low",
}
QUEUE_ORDER = ["queue:high", "queue:medium", "queue:low"]  # Poll order: strict priority

# ── Redis Client Initialization ───────────────────────────────────────────────
# FIX: Preserved socket_timeout and decode_responses to prevent worker crashes
r = redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    socket_timeout=7.0,
    decode_responses=True
)

# ── Write helpers ─────────────────────────────────────────────────────────────

def push_task(task: dict):
    """Store task metadata and enqueue by priority."""
    task_key = f"{TASK_PREFIX}{task['id']}"
    r.hset(task_key, mapping={k: json.dumps(v) for k, v in task.items()})

    priority = task.get("priority", "medium")
    queue_key = QUEUES.get(priority, QUEUES["medium"])
    r.lpush(queue_key, task["id"])


def push_to_dlq(task: dict):
    """Move an exhausted task to the Dead Letter Queue."""
    task_key = f"{TASK_PREFIX}{task['id']}"
    r.hset(task_key, mapping={k: json.dumps(v) for k, v in task.items()})
    r.lpush(DLQ_KEY, task["id"])


def requeue_task(task: dict):
    """Re-enqueue a task for retry (same priority, back of its queue)."""
    task_key = f"{TASK_PREFIX}{task['id']}"
    r.hset(task_key, mapping={k: json.dumps(v) for k, v in task.items()})

    priority = task.get("priority", "medium")
    queue_key = QUEUES.get(priority, QUEUES["medium"])
    r.lpush(queue_key, task["id"])   # lpush = back at the head for next cycle


# ── Read helpers ──────────────────────────────────────────────────────────────

def pop_task() -> dict | None:
    """
    Blocking pop — checks HIGH, then MEDIUM, then LOW.
    BRPOP accepts multiple keys and returns from the first non-empty one.
    """
    try:
        result = r.brpop(QUEUE_ORDER, timeout=5)
        if not result:
            return None
        _, task_id = result
        return get_task(task_id)  # Cleaned: No .decode() needed
    except redis.exceptions.TimeoutError:
        return None


def get_task(task_id: str) -> dict | None:
    task_key = f"{TASK_PREFIX}{task_id}"
    data = r.hgetall(task_key)
    if not data:
        return None
    # Cleaned: Keys and values are native strings now due to decode_responses=True
    return {k: json.loads(v) for k, v in data.items()}


def update_task(task_id: str, fields: dict):
    task_key = f"{TASK_PREFIX}{task_id}"
    r.hset(task_key, mapping={k: json.dumps(v) for k, v in fields.items()})


def get_dlq_tasks() -> list[dict]:
    """Return all tasks currently sitting in the DLQ."""
    task_ids = r.lrange(DLQ_KEY, 0, -1)
    tasks = []
    for tid in task_ids:
        task = get_task(tid)  # Cleaned: No .decode() needed
        if task:
            tasks.append(task)
    return tasks


def get_all_tasks() -> list[dict]:
    """Scan all task:* keys — used by the dashboard."""
    keys = r.keys(f"{TASK_PREFIX}*")
    tasks = []
    for key in keys:
        data = r.hgetall(key)
        if data:
            # Cleaned: No .decode() needed
            tasks.append({k: json.loads(v) for k, v in data.items()})
    return tasks