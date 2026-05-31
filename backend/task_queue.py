import redis
import json
import os
from dotenv import load_dotenv

load_dotenv()

QUEUE_KEY = "task_queue"          # Redis list — our queue
TASK_PREFIX = "task:"             # Redis hash prefix for task metadata

# FIX: Add socket_timeout keyword argument. It must be larger than your brpop timeout (5).
# Also added decode_responses=True so you can drop all those manual .decode() calls!
r = redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    socket_timeout=7.0,
    decode_responses=True
)


def push_task(task: dict):
    """Push task ID onto the queue and store task data as a Redis hash."""
    task_key = f"{TASK_PREFIX}{task['id']}"
    r.hset(task_key, mapping={k: json.dumps(v) for k, v in task.items()})
    r.lpush(QUEUE_KEY, task["id"])          # left push = newest at head


def pop_task() -> dict | None:
    """Blocking right pop — waits up to 5s for a task."""
    try:
        result = r.brpop(QUEUE_KEY, timeout=5)  # right pop = FIFO
        if not result:
            return None
        _, task_id = result
        
        # No more .decode() needed because decode_responses=True handles it globally
        return get_task(task_id) 
    except redis.exceptions.TimeoutError:
        # Gracefully handle network hiccups or socket closures
        return None


def get_task(task_id: str) -> dict | None:
    task_key = f"{TASK_PREFIX}{task_id}"
    data = r.hgetall(task_key)
    if not data:
        return None
        
    # Cleaned up: k and v are already strings now because of decode_responses=True
    return {k: json.loads(v) for k, v in data.items()}


def update_task(task_id: str, fields: dict):
    task_key = f"{TASK_PREFIX}{task_id}"
    r.hset(task_key, mapping={k: json.dumps(v) for k, v in fields.items()})