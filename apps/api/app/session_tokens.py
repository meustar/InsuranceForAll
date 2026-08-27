"""불투명 익명 세션 토큰과 pepper HMAC. 나이·성별을 인코딩하지 않는다."""

from __future__ import annotations

import hashlib
import hmac
import secrets

COOKIE_NAME = "ifa_anon"
COOKIE_MAX_AGE_SECONDS = 30 * 60
TOKEN_BYTES = 32


def issue_session_token() -> str:
    """쿠키에만 넣을 난수. 프로필 값을 섞지 않는다."""
    return secrets.token_urlsafe(TOKEN_BYTES)


def hmac_session_token(pepper: str, token: str) -> bytes:
    """문서·리포트 행에 둘 HMAC-SHA-256. 통계 POST에서는 INSERT하지 않는다."""
    return hmac.new(pepper.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).digest()


def bind_session_cookie(request, response, *, secure: bool, token: str | None = None) -> str:
    """불투명 토큰을 발급·재사용하고 30분 비활성 수명을 갱신한다."""
    if token is None:
        existing = request.cookies.get(COOKIE_NAME)
        token = existing if existing and len(existing.encode("utf-8")) >= 32 else issue_session_token()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    return token


def expire_session_cookie(response, *, secure: bool) -> None:
    """프로필 초기화 요청에서 익명 쿠키를 같은 속성으로 즉시 만료한다."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=secure,
        httponly=True,
        samesite="lax",
    )
