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
