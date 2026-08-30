from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.ops_auth import credentials_match, issue_ops_token, ops_token_valid

_OPS_USER = "ops-operator"
_OPS_PASS = "ops-pass-not-a-secret"
_PEPPER = "ops-pepper-placeholder-not-a-secret"
_APPLICANT = "applicant@example.com"


class _Secret:
    def __init__(self, value: str) -> None:
        self._value = value

    def get_secret_value(self) -> str:
        return self._value


def _settings(**extra):
    values = {
        "admin_username": _OPS_USER,
        "admin_password": _Secret(_OPS_PASS),
        "admin_session_pepper": _Secret(_PEPPER),
        "session_cookie_secure": False,
        "contact_encryption_key": _Secret("contact-placeholder-not-a-secret"),
        "document_staging_dir": "/tmp/ifa-ops-test",
        "document_result_retention_hours": 24,
    }
    values.update(extra)
    return type("S", (), values)()


def _override_db() -> None:
    async def override():
        yield MagicMock()

    app.dependency_overrides[get_db] = override


def test_ops_requires_login(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.ops.get_settings", lambda: _settings())
    _override_db()
    client = TestClient(app)
    try:
        denied = client.get("/api/v1/ops/dashboard")
        assert denied.status_code == 401
        assert _APPLICANT not in denied.text
    finally:
        app.dependency_overrides.clear()


def test_ops_login_logout_and_dashboard(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.ops.get_settings", lambda: _settings())
    monkeypatch.setattr(
        "app.routers.ops.cache_head_summaries",
        AsyncMock(return_value=[{"source": "medical", "stale": False}]),
    )
    monkeypatch.setattr(
        "app.routers.ops.decrypted_consultations",
        AsyncMock(
            return_value=[
                {
                    "id": str(uuid4()),
                    "contact_channel": "email",
                    "email": _APPLICANT,
                    "purpose_note": None,
                    "created_at": "2026-08-30T00:00:00+00:00",
                    "expires_at": "2026-09-29T00:00:00+00:00",
                }
            ]
        ),
    )
    monkeypatch.setattr("app.routers.ops.documents_for_hash", AsyncMock(return_value=[]))
    _override_db()
    client = TestClient(app)
    try:
        refused = client.post(
            "/api/v1/ops/session",
            json={"username": _OPS_USER, "password": "wrong-pass-not-a-secret"},
        )
        assert refused.status_code == 401
        created = client.post(
            "/api/v1/ops/session",
            json={"username": _OPS_USER, "password": _OPS_PASS},
        )
        assert created.status_code == 200
        assert created.cookies.get("ifa_ops")
        dash = client.get("/api/v1/ops/dashboard")
        assert dash.status_code == 200
        assert dash.headers.get("cache-control") == "no-store"
        assert dash.json()["consultations"][0]["email"] == _APPLICANT
        notice = client.get("/api/v1/consultations/notice")
        assert _APPLICANT not in notice.text
        client.delete("/api/v1/ops/session")
        after = client.get("/api/v1/ops/dashboard")
        assert after.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_ops_sync_queues_without_seed(monkeypatch) -> None:
    queued = MagicMock()
    monkeypatch.setattr("app.routers.ops.get_settings", lambda: _settings())
    monkeypatch.setattr("app.routers.ops.enqueue_public_sync", queued)
    client = TestClient(app)
    token = issue_ops_token(_PEPPER)
    client.cookies.set("ifa_ops", token)
    assert ops_token_valid(_PEPPER, token)
    posted = client.post("/api/v1/ops/sync")
    assert posted.status_code == 200
    queued.assert_called_once()
    assert posted.json()["status"] == "queued"


def test_credentials_reject_empty_expected() -> None:
    assert credentials_match(
        username="ops",
        password="x",
        expected_user="",
        expected_password="x",
    ) is False


def test_ops_login_disabled_without_pepper(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.routers.ops.get_settings",
        lambda: _settings(admin_session_pepper=_Secret("")),
    )
    client = TestClient(app)
    response = client.post(
        "/api/v1/ops/session",
        json={"username": _OPS_USER, "password": _OPS_PASS},
    )
    assert response.status_code == 503
