import time
import logging
from datetime import datetime, timezone
# NOTE: Using 'task_queue' to match your actual file from the previous step
from task_queue import pop_task, update_task, requeue_task, push_to_dlq

logging.basicConfig(level=logging.INFO, format="%(asctime)s [WORKER] %(message)s")


# ── Task handlers ─────────────────────────────────────────────────────────────

def handle_send_email(payload: dict) -> str:
    time.sleep(1)
    # Simulate occasional failure if explicit 'fail' flag passed in payload
    if payload.get("fail"):
        raise ConnectionError("SMTP server unreachable")
    return f"Email sent to {payload.get('to', 'unknown')}"


def handle_generate_report(payload: dict) -> str:
    time.sleep(2)
    return f"Report generated: report_{payload.get('type', 'default')}.pdf"


def handle_default(payload: dict) -> str:
    time.sleep(0.5)
    if payload.get("fail"):
        raise ValueError("Simulated task failure")
    return "Task completed"


HANDLERS = {
    "send_email":       handle_send_email,
    "generate_report":  handle_generate_report,
}


# ── Retry logic ───────────────────────────────────────────────────────────────

def exponential_backoff(retry_count: int) -> float:
    """
    Delay before retrying: 2^retry_count seconds.
    retry 0 → 1s,  retry 1 → 2s,  retry 2 → 4s,  retry 3 → 8s
    Capped at 60s so a high retry_count doesn't block the loop indefinitely.
    """
    return min(2 ** retry_count, 60)


def process_task(task: dict):
    task_id     = task["id"]
    name        = task["name"]
    payload     = task["payload"]
    retry_count = int(task.get("retry_count", 0))
    max_retries = int(task.get("max_retries", 3))
    priority    = task.get("priority", "medium")

    logging.info(f"[{priority.upper()}] Picked up {task_id} ({name}) — attempt {retry_count + 1}/{max_retries + 1}")

    # Mark as running
    update_task(task_id, {
        "status":     "running",
        "updated_at": datetime.now(timezone.utc).isoformat()
    })

    try:
        handler = HANDLERS.get(name, handle_default)
        result  = handler(payload)

        update_task(task_id, {
            "status":     "done",
            "result":     result,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logging.info(f"Task {task_id} DONE — {result}")

    except Exception as e:
        logging.warning(f"Task {task_id} FAILED (attempt {retry_count + 1}) — {e}")

        if retry_count < max_retries:
            # ── Retry path ────────────────────────────────────────────────────
            delay = exponential_backoff(retry_count)
            logging.info(f"Retrying {task_id} in {delay}s (retry {retry_count + 1}/{max_retries})")

            time.sleep(delay)  # Backoff sleep interval before re-inserting to Redis

            task["retry_count"] = retry_count + 1
            task["status"]      = "pending"
            task["error"]       = str(e)
            task["updated_at"]  = datetime.now(timezone.utc).isoformat()

            requeue_task(task)

        else:
            # ── Dead letter path ──────────────────────────────────────────────
            logging.error(f"Task {task_id} exhausted all retries → DLQ")

            task["status"]      = "dead"
            task["error"]       = str(e)
            task["updated_at"]  = datetime.now(timezone.utc).isoformat()

            # Ensure the tracking hash is synced as "dead" before pushing the ID to DLQ list
            update_task(task_id, {
                "status":     "dead",
                "error":      str(e),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            push_to_dlq(task)


# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    logging.info("Worker started — HIGH > MEDIUM > LOW priority polling")
    while True:
        task = pop_task()
        if task:
            process_task(task)


if __name__ == "__main__":
    main()