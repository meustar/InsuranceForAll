"""Celery 앱. Redis 브로커와 concurrency=1을 worker 설정에서 읽는다."""

from celery import Celery

from worker.config import get_settings

_settings = get_settings()
_broker = _settings.redis_url.get_secret_value()

app = Celery(
    "insurance_for_all",
    broker=_broker,
    backend=_broker,
    include=["worker.tasks"],
)
app.conf.update(
    worker_concurrency=_settings.celery_concurrency,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,
)
