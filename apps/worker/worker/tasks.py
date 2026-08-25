from worker.app import app


@app.task(name="worker.ping")
def ping() -> dict[str, str]:
    return {"status": "ok"}
