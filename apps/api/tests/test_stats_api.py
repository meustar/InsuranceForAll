from datetime import date
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.services.stats_query import CacheBundle
from app.session_tokens import COOKIE_NAME, hmac_session_token, issue_session_token

_today = date.today()
_BODY = {
    "birthDate": _today.replace(year=_today.year - 40, day=1).isoformat(),
    "sex": "남자",
    "areaNm": "서울",
}


async def _fake_db():
    yield MagicMock()


def _client() -> TestClient:
    app.dependency_overrides[get_db] = _fake_db
    return TestClient(app)


def _patch_cache(monkeypatch, *, stale: bool = False, rows=None, total: int = 1) -> None:
    rows = rows if rows is not None else [{"prd_nm": "CACHE-ROW", "age": 40}]
    bundle = CacheBundle(stale=stale, base_period="202601", sync_run_id=uuid4())
    monkeypatch.setattr(
        "app.routers.stats.load_cache_bundle",
        AsyncMock(return_value=bundle),
    )
    monkeypatch.setattr(
        "app.routers.stats.query_health",
        AsyncMock(return_value=(rows, total, False)),
    )
    monkeypatch.setattr(
        "app.routers.stats.query_auto",
        AsyncMock(return_value=(rows, total, False)),
    )
    monkeypatch.setattr(
        "app.routers.stats.query_life",
        AsyncMock(return_value=(rows, total, False)),
    )


def test_hmac_does_not_encode_profile() -> None:
    token = issue_session_token()
    digest = hmac_session_token("local-test-placeholder-not-a-secret", token)
    assert len(digest) == 32
    assert len(token.encode("utf-8")) >= 32
    assert "남자" not in token
    assert _BODY["birthDate"] not in token
    assert "서울" not in token


def test_health_post_sets_httponly_cookie_and_omits_birth(monkeypatch) -> None:
    _patch_cache(monkeypatch)
    client = _client()
    try:
        response = client.post("/api/v1/stats/health", json=_BODY)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert "birth_date" not in data
    assert "birthDate" not in data
    assert data["stale"] is False
    assert data["stale_message"] is None
    assert data["adapter"] == {"age": data["insurance_age"]}
    assert data["scope"] == "health"
    assert "권하거나" in data["disclaimer"]
    assert response.headers.get("cache-control") == "no-store"
    cookie = response.cookies.get(COOKIE_NAME)
    assert cookie
    assert "httponly" in response.headers.get("set-cookie", "").lower()
    assert "samesite=lax" in response.headers.get("set-cookie", "").lower()
    assert "max-age=1800" in response.headers.get("set-cookie", "").lower()
    assert cookie not in response.text


def test_stats_reuses_cookie_and_refreshes_max_age(monkeypatch) -> None:
    _patch_cache(monkeypatch)
    client = _client()
    try:
        first = client.post("/api/v1/stats/health", json=_BODY)
        token = first.cookies.get(COOKIE_NAME)
        second = client.post("/api/v1/stats/auto", json=_BODY)
    finally:
        app.dependency_overrides.clear()
    assert second.status_code == 200
    assert second.cookies.get(COOKIE_NAME) == token
    assert "max-age=1800" in second.headers.get("set-cookie", "").lower()


def test_stale_flag_and_query_birth_rejected(monkeypatch) -> None:
    _patch_cache(monkeypatch, stale=True)
    client = _client()
    try:
        ok = client.post("/api/v1/stats/auto", json=_BODY)
        banned = client.post("/api/v1/stats/auto?birthDate=redacted", json=_BODY)
        missing = client.post("/api/v1/stats/life", json=_BODY)
    finally:
        app.dependency_overrides.clear()
    assert ok.status_code == 200
    assert ok.json()["stale"] is True
    assert ok.json()["stale_message"]
    assert ok.json()["adapter"]["aggr"]
    assert banned.status_code == 400
    assert _BODY["birthDate"] not in banned.text
    assert missing.status_code == 200
    assert missing.json()["adapter"]["rchnAggr"]
    assert missing.json()["adapter"]["areaNm"] == "서울"


def test_no_cache_is_503_without_portal(monkeypatch) -> None:
    portal = MagicMock()
    monkeypatch.setattr("app.routers.stats.load_cache_bundle", AsyncMock(return_value=None))
    monkeypatch.setattr("app.jobs.portal_client.fetch_all_items", portal)
    client = _client()
    try:
        response = client.post("/api/v1/stats/health", json=_BODY)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503
    portal.assert_not_called()


def test_get_stats_not_allowed() -> None:
    client = TestClient(app)
    response = client.get("/api/v1/stats/health")
    assert response.status_code == 405
