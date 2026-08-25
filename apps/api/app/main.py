from fastapi import FastAPI

from app.config import get_settings

app = FastAPI(title="Insurance For All API", version="0.1.0")


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    get_settings()
    return {"status": "ok"}
