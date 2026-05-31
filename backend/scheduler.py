"""
Scheduler — runs as a separate process alongside the worker.
Every second it checks the sorted set for tasks whose run_at has passed
and promotes them into the real work queue.
"""
import time
import logging
# FIX: Points to your actual task_queue.py file where promote_ready_tasks lives
from task_queue import promote_ready_tasks

logging.basicConfig(level=logging.INFO, format="%(asctime)s [SCHEDULER] %(message)s")

POLL_SECONDS = 1   # Check every second — optimal threshold for our scale


def main():
    logging.info("Scheduler started. Checking for ready tasks every 1s…")
    while True:
        try:
            promoted = promote_ready_tasks()
            if promoted:
                logging.info(f"Promoted {promoted} scheduled task(s) → active priority pipeline")
        except Exception as e:
            logging.error(f"Scheduler evaluation loop encountered a fault: {e}")
            
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()