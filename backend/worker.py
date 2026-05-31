import time
import logging
from datetime import datetime, timezone
from task_queue import pop_task, update_task

logging.basicConfig(level=logging.INFO, format="%(asctime)s [WORKER] %(message)s")


# ── Fake task handlers ────────────────────────────────────────────────────────
# In a real system these would send emails, process files, etc.
def handle_send_email(payload: dict) -> str:
    time.sleep(2)   # simulate network call
    return f"Email sent to {payload.get('to', 'unknown')}"


def handle_generate_report(payload: dict) -> str:
    time.sleep(3)   # simulate CPU work
    return f"Report generated: report_{payload.get('type', 'default')}.pdf"


def handle_default(payload: dict) -> str:
    time.sleep(1)
    return "Task completed"


HANDLERS = {
    "send_email": handle_send_email,
    "generate_report": handle_generate_report,
}


# ── Main loop ─────────────────────────────────────────────────────────────────
def process_task(task: dict):
    task_id = task["id"]
    name = task["name"]
    payload = task["payload"]

    logging.info(f"Picked up task {task_id} ({name})")

    # Mark as running
    update_task(task_id, {
        "status": "running",
        "updated_at": datetime.now(timezone.utc).isoformat()
    })

    try:
        handler = HANDLERS.get(name, handle_default)
        result = handler(payload)

        update_task(task_id, {
            "status": "done",
            "result": result,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logging.info(f"Task {task_id} DONE — {result}")

    except Exception as e:
        update_task(task_id, {
            "status": "failed",
            "error": str(e),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        logging.error(f"Task {task_id} FAILED — {e}")


def main():
    logging.info("Worker started. Polling for tasks...")
    while True:
        task = pop_task()
        if task:
            process_task(task)


if __name__ == "__main__":
    main()