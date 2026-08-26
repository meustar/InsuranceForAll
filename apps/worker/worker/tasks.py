from worker.app import app


@app.task(name="worker.ping")
def ping() -> dict[str, str]:
    """워커 프로세스가 큐를 소비하는지 확인하는 생존 태스크."""
    return {"status": "ok"}


@app.task(name="worker.sync_public_api")
def sync_public_api(seed: bool = False) -> dict[str, str]:
    """api 패키지의 F-11 배치를 Celery에서 호출한다. OpenAI 키는 쓰지 않는다."""
    from app.jobs.sync_public_api import run_all

    return run_all(seed=seed)


@app.task(name="worker.mask_document")
def mask_document(job_id: str) -> dict[str, str]:
    """업로드 PDF를 마스킹 JSON으로 바꾸고 원본 파일을 삭제한다. LLM은 호출하지 않는다."""
    from worker.pdf_mask import run_mask

    return run_mask(job_id)
