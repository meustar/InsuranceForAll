"""운영자 HMAC 쿠키. JWT가 아니며 사용자 ifa_anon·프로필과 섞지 않는다."""

from __future__ import annotations

import hashlib
import hmac
import secrets

from fastapi import Response

OPS_COOKIE_NAME = "ifa_ops"
OPS_COOKIE_MAX_AGE_SECONDS = 30 * 60


def _pepper_digest(pepper: str, value: str) -> str:
    return hmac.new(pepper.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def credentials_match(*, username: str, password: str, expected_user: str, expected_password: str) -> bool:
    """길이가 달라도 비교한다. 값은 로그하지 않는다."""
    if not expected_user or not expected_password:
        return False
    user_ok = hmac.compare_digest(
        hashlib.sha256(username.encode("utf-8")).digest(),
        hashlib.sha256(expected_user.encode("utf-8")).digest(),
    )
    pass_ok = hmac.compare_digest(
        hashlib.sha256(password.encode("utf-8")).digest(),
        hashlib.sha256(expected_password.encode("utf-8")).digest(),
    )
    return user_ok and pass_ok


def issue_ops_token(pepper: str) -> str:
    """쿠키에만 둘 난수+HMAC. 운영자 이름·이메일을 인코딩하지 않는다."""
    nonce = secrets.token_urlsafe(32)
    return f"{nonce}.{_pepper_digest(pepper, nonce)}"


def ops_token_valid(pepper: str, token: str | None) -> bool:
    if not token or "." not in token:
        return False
    nonce, signature = token.rsplit(".", 1)
    expected = _pepper_digest(pepper, nonce)
    return hmac.compare_digest(signature, expected)


def ops_token_hash(pepper: str, token: str) -> bytes:
    """다건 PDF job을 운영 쿠키에만 묶기 위한 HMAC-SHA-256."""
    return hmac.new(pepper.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).digest()


def bind_ops_cookie(response: Response, *, token: str, secure: bool) -> None:
    """운영 세션만 심는다. path=/ops와 /api를 쓰려면 path=/ 가 필요하다."""
    response.set_cookie(
        key=OPS_COOKIE_NAME,
        value=token,
        max_age=OPS_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


def expire_ops_cookie(response: Response, *, secure: bool) -> None:
    """로그아웃 시 운영 쿠키만 만료한다. ifa_anon은 건드리지 않는다."""
    response.delete_cookie(
        key=OPS_COOKIE_NAME,
        path="/",
        secure=secure,
        httponly=True,
        samesite="lax",
    )
