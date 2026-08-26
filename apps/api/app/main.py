"""FastAPI 진입점. P0는 프로세스 생존 확인만 노출한다."""

from fastapi import FastAPI

from app.config import get_settings

app = FastAPI(title="Insurance For All API", version="0.1.0")


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    """설정 로드가 가능한지 확인하고 비밀값 없이 생존 상태를 반환한다."""
    get_settings()
    return {"status": "ok"}
