"""문서 마스킹 작업을 Redis 브로커에 넣는다. 원본 파일명·바이트는 인자로 두지 않는다."""

from functools import lru_cache

from app.config import get_settings


@lru_cache
def get_celery():
    """API가 worker와 같은 브로커에 작업 이름만 보낸다."""
    from celery import Celery

    url = get_settings().redis_url.get_secret_value()
    return Celery("insurance_for_all", broker=url, backend=url)


def enqueue_mask_document(job_id: str) -> None:
    """job_id만 전달한다. 경로에 업로드 파일명을 넣지 않는다."""
    get_celery().send_task("worker.mask_document", args=[job_id])
