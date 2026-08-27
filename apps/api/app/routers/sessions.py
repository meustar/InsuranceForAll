"""DELETE /api/v1/session — 서버 상태 없이 익명 산출물 쿠키만 만료한다."""

from fastapi import APIRouter, Response

from app.config import get_settings
from app.session_tokens import expire_session_cookie

router = APIRouter(prefix="/api/v1", tags=["session"])


@router.delete("/session", status_code=204)
def clear_session(response: Response) -> None:
    """브라우저 프로필 초기화와 함께 ifa_anon 쿠키를 만료한다."""
    response.headers["Cache-Control"] = "no-store"
    expire_session_cookie(response, secure=get_settings().session_cookie_secure)
