from fastapi.testclient import TestClient
from starlette.requests import Request
from starlette.responses import Response

from app.main import app
from app.session_tokens import COOKIE_NAME, bind_session_cookie, issue_session_token


def test_clear_session_expires_cookie_without_response_body() -> None:
    client = TestClient(app)
    client.cookies.set(COOKIE_NAME, issue_session_token())

    response = client.delete("/api/v1/session")

    assert response.status_code == 204
    assert response.content == b""
    assert response.headers.get("cache-control") == "no-store"
    set_cookie = response.headers.get("set-cookie", "").lower()
    assert f'{COOKIE_NAME}=""' in set_cookie
    assert "max-age=0" in set_cookie
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie
    assert "expires=" in set_cookie


def test_https_policy_sets_secure_cookie() -> None:
    request = Request({"type": "http", "headers": []})
    response = Response()

    bind_session_cookie(request, response, secure=True)

    set_cookie = response.headers.get("set-cookie", "").lower()
    assert "secure" in set_cookie
    assert "httponly" in set_cookie
    assert "max-age=1800" in set_cookie
