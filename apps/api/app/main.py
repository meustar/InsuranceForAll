"""FastAPI 진입점. 생존 확인, 통계 조회, 스코프별 AI 리포트를 노출한다."""

from fastapi import FastAPI

from app.config import get_settings
from app.routers.reports import router as reports_router
from app.routers.stats import router as stats_router

app = FastAPI(title="Insurance For All API", version="0.1.0")
app.include_router(stats_router)
app.include_router(reports_router)


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    """설정 로드가 가능한지 확인하고 비밀값 없이 생존 상태를 반환한다."""
    get_settings()
    return {"status": "ok"}
