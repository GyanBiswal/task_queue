import redis
import json
import os
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ── Key constants ─────────────────────────────────────────────────────────────
TASK_PREFIX   = "task:"             # Redis hash prefix for task metadata
DLQ_KEY       = "queue:dead"            # Dead Letter Queue — tasks that exhausted retries
SCHEDULED_KEY = "queue:scheduled"       # Redis Sorted Set — score = run_at unix timestamp

# Three separate Redis lists — one per priority level.
QUEUES = {
    "high":   "queue:high",
    "medium": "queue:medium",
    "low":    "queue:low",
}
QUEUE_ORDER = ["queue:high", "queue:medium", "queue:low"]  # Poll order: strict priority


# ── Redis Client Initialization ───────────────────────────────────────────────
# FIX: Preserved socket_timeout and decode_responses to prevent worker crashes.
# Global string decoding eliminates the need for manual .decode() on bytes.
r = redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    socket_timeout=7.0,
    decode_responses=True
)


# ── Task metadata helpers ─────────────────────────────────────────────────────

def save_task(task: dict):
    """Persist task metadata to Redis hash."""
    task_key = f"{TASK_PREFIX}{task['id']}"
    r.hset(task_key, mapping={k: json.dumps(v) for k, v in task.items()})


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


# ── Enqueue helpers ───────────────────────────────────────────────────────────

def push_task(task: dict):
    """
    Route task to either:
    - The scheduled sorted set (if run_at is in the future), or
    - The immediate priority queue (if run_at is None or already past)
    """
    save_task(task)

    run_at = task.get("run_at")

    if run_at and run_at != "null":
        run_at_dt = datetime.fromisoformat(run_at)
        now       = datetime.now(timezone.utc)

        if run_at_dt > now:
            # Future task — park in sorted set, score = unix timestamp
            score = run_at_dt.timestamp()
            r.zadd(SCHEDULED_KEY, {task["id"]: score})
            return   # Hold task inside ZSET; don't push to immediate queues yet

    # Immediate or past-due task
    _enqueue_immediate(task)


def _enqueue_immediate(task: dict):
    """Push a task into the correct priority queue."""
    priority  = task.get("priority", "medium")
    queue_key = QUEUES.get(priority, QUEUES["medium"])
    r.lpush(queue_key, task["id"])


def requeue_task(task: dict):
    """Re-enqueue a task for retry (skip run_at check — retry immediately)."""
    save_task(task)
    _enqueue_immediate(task)


def push_to_dlq(task: dict):
    """Move an exhausted task to the Dead Letter Queue."""
    save_task(task)
    r.lpush(DLQ_KEY, task["id"])


# ── Scheduler helpers ─────────────────────────────────────────────────────────

def promote_ready_tasks() -> int:
    """
    Called by scheduler.py ticking daemon.
    Finds all tasks in the sorted set whose score <= now,
    removes them from the set, and pushes them to the work queue.
    Returns how many tasks were promoted.
    """
    now = time.time()

    # ZRANGEBYSCORE returns task IDs with score between 0 and now (ready to run)
    ready_ids = r.zrangebyscore(SCHEDULED_KEY, 0, now)

    if not ready_ids:
        return 0

    for task_id in ready_ids:
        task = get_task(task_id) # Cleaned: No manual .decode() needed
        if not task:
            continue

        # Atomically remove from scheduled sorted set
        r.zrem(SCHEDULED_KEY, task_id)

        # Update status to pending and push to priority processing pipeline
        update_task(task_id, {"status": "pending"})
        task["status"] = "pending"
        _enqueue_immediate(task)

    return len(ready_ids)


def get_scheduled_tasks() -> list[dict]:
    """Return all tasks currently waiting in the scheduled set."""
    entries = r.zrangebyscore(SCHEDULED_KEY, 0, "+inf", withscores=True)
    tasks   = []
    for task_id, score in entries:
        task = get_task(task_id) # Cleaned: No manual .decode() needed
        if task:
            tasks.append(task)
    return tasks


# ── Read helpers ──────────────────────────────────────────────────────────────

def pop_task() -> dict | None:
    """
    Blocking pop — checks HIGH, then MEDIUM, then LOW lists sequentially.
    BRPOP returns from the first non-empty list encountered.
    """
    try:
        result = r.brpop(QUEUE_ORDER, timeout=5)
        if not result:
            return None
        _, task_id = result
        return get_task(task_id) # Cleaned: No manual .decode() needed
    except redis.exceptions.TimeoutError:
        return None


def get_dlq_tasks() -> list[dict]:
    """Return all tasks currently sitting in the DLQ."""
    task_ids = r.lrange(DLQ_KEY, 0, -1)
    tasks    = []
    for tid in task_ids:
        task = get_task(tid) # Cleaned: No manual .decode() needed
        if task:
            tasks.append(task)
    return tasks


def get_all_tasks() -> list[dict]:
    """Scan all task:* keys — used by the engine dashboard tracking matrix."""
    keys  = r.keys(f"{TASK_PREFIX}*")
    tasks = []
    for key in keys:
        data = r.hgetall(key)
        if data:
            # Cleaned: Structural comprehension uses direct decoded strings
            tasks.append({k: json.loads(v) for k, v in data.items()})
    return tasks