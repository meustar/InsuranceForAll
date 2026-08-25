from worker.config import get_settings
from worker.tasks import ping


def test_concurrency_default_is_one() -> None:
    assert get_settings().celery_concurrency == 1


def test_ping_task_body() -> None:
    assert ping() == {"status": "ok"}
