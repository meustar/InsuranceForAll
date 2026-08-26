from worker.app import app


@app.task(name="worker.ping")
def ping() -> dict[str, str]:
    """워커 프로세스가 큐를 소비하는지 확인하는 생존 태스크."""
    return {"status": "ok"}


@app.task(name="worker.sync_public_api")
def sync_public_api(seed: bool = False) -> dict[str, str]:
    from app.jobs.sync_public_api import run_all

    return run_all(seed=seed)
