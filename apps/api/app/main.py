"""FastAPI 진입점. 생존 확인, 통계, 리포트, PDF, 이메일 상담을 노출한다."""

from fastapi import FastAPI

from app.config import get_settings
from app.routers.consultations import router as consultations_router
from app.routers.documents import router as documents_router
from app.routers.reports import router as reports_router
from app.routers.ops import router as ops_router
from app.routers.sessions import router as sessions_router
from app.routers.stats import router as stats_router

app = FastAPI(title="Insurance For All API", version="0.1.0")
app.include_router(stats_router)
app.include_router(reports_router)
app.include_router(documents_router)
app.include_router(consultations_router)
app.include_router(sessions_router)
app.include_router(ops_router)


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    """설정 로드가 가능한지 확인하고 비밀값 없이 생존 상태를 반환한다."""
    get_settings()
    return {"status": "ok"}
