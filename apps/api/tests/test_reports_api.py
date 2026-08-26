from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import AiReport
from app.services.llm_reports import LlmInputError, fallback_markdown, sanitize_display_payload

_DISPLAYED = {
    "scope": "auto",
    "as_of_date": "2026-08-26",
    "base_period": "202601",
    "row_count": 3,
    "adapter": {"aggr": "30대"},
    "disclaimer": "공공 통계를 참고용으로 보여 줍니다. 가입을 권하거나 개인 보험료를 확정하지 않습니다.",
    "rows": [{"isu_itms_nm": "개인용", "join_cnt": 10}],
}


class FakeReportSession:
    def __init__(self) -> None:
        self.reports: dict[UUID, AiReport] = {}

    def add(self, obj: AiReport) -> None:
        self.reports[obj.id] = obj

    async def commit(self) -> None:
        return None

    async def get(self, _model, ident):
        return self.reports.get(ident)


def _client(store: FakeReportSession) -> TestClient:
    async def override():
        yield store

    app.dependency_overrides[get_db] = override
    return TestClient(app)


def test_placeholder_key_does_not_call_network() -> None:
    import asyncio

    from app.services.llm_reports import complete_explanation

    text = asyncio.run(
        complete_explanation(
            api_key="local-test-placeholder-not-a-secret",
            model="gpt-5.6-luna",
            summary=_DISPLAYED,
        )
    )
    assert text is None


def test_sanitize_rejects_birth_and_raw_pdf() -> None:
    try:
        sanitize_display_payload({"row_count": 1, "birthDate": "x"}, None)
        raise AssertionError("expected LlmInputError")
    except LlmInputError:
        pass
    try:
        sanitize_display_payload({"row_count": 1}, {"raw_pdf": "x"})
        raise AssertionError("expected LlmInputError")
    except LlmInputError:
        pass
    clean = sanitize_display_payload(_DISPLAYED, {"preview_masked": "***"})
    dumped = str(clean).lower()
    assert "birth" not in dumped
    assert "raw_pdf" not in dumped


def test_fallback_has_no_solicitation() -> None:
    text = fallback_markdown("health", _DISPLAYED)
    assert "가입하세요" not in text
    assert "최적" not in text
    assert "참고" in text
    assert "3" in text


def test_create_get_report_roundtrip(monkeypatch) -> None:
    llm = AsyncMock(return_value="공공 통계 참고 설명입니다. 표의 가입대수만 이야기합니다.")
    monkeypatch.setattr("app.routers.reports.complete_explanation", llm)
    store = FakeReportSession()
    client = _client(store)
    try:
        created = client.post("/api/v1/reports", json={"scope": "auto", "displayedStats": _DISPLAYED})
        assert llm.await_args is not None
        sent = llm.await_args.kwargs.get("summary") or {}
        assert "birth" not in str(sent).lower()
        assert sent.get("row_count") == 3
        assert created.status_code == 200
        payload = created.json()
        assert set(payload) == {"report_id", "access_token"}
        token = payload["access_token"]
        report_id = payload["report_id"]
        assert created.headers.get("cache-control") == "no-store"
        stored = store.reports[UUID(report_id)]
        assert token.encode("utf-8") not in stored.access_token_hash
        assert token not in stored.body_markdown
        assert len(stored.access_token_hash) == 32
        got = client.get(
            f"/api/v1/reports/{report_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert got.status_code == 200
        body = got.json()
        assert body["is_fallback"] is False
        assert "birth" not in str(body["input_summary"]).lower()
        assert got.headers.get("cache-control") == "no-store"
        assert "access_token" not in body
        denied = client.get(f"/api/v1/reports/{report_id}")
        assert denied.status_code == 401
        query = client.get(f"/api/v1/reports/{report_id}?access_token={token}")
        assert query.status_code == 400
        assert token not in query.text
    finally:
        app.dependency_overrides.clear()


def test_llm_failure_and_banned_output_use_fallback(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.reports.complete_explanation", AsyncMock(return_value=None))
    store = FakeReportSession()
    client = _client(store)
    try:
        created = client.post("/api/v1/reports", json={"scope": "health", "displayed_stats": _DISPLAYED})
        report = store.reports[UUID(created.json()["report_id"])]
        assert report.is_fallback is True
        assert "가입하세요" not in report.body_markdown
        assert "최적" not in report.body_markdown
    finally:
        app.dependency_overrides.clear()

    monkeypatch.setattr(
        "app.routers.reports.complete_explanation",
        AsyncMock(return_value="이 상품이 최적 상품입니다. 지금 가입하세요."),
    )
    store2 = FakeReportSession()
    client2 = _client(store2)
    try:
        created = client2.post("/api/v1/reports", json={"scope": "life", "displayedStats": _DISPLAYED})
        report = store2.reports[UUID(created.json()["report_id"])]
        assert report.is_fallback is True
        assert "최적 상품" not in report.body_markdown
        assert "가입하세요" not in report.body_markdown
    finally:
        app.dependency_overrides.clear()


def test_rejects_profile_in_displayed_stats(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.reports.complete_explanation", AsyncMock(return_value="ok"))
    store = FakeReportSession()
    client = _client(store)
    try:
        response = client.post(
            "/api/v1/reports",
            json={"scope": "health", "displayedStats": {"row_count": 1, "birthDate": "1990-01-01"}},
        )
        assert response.status_code == 400
        assert "1990" not in response.text
        assert store.reports == {}
    finally:
        app.dependency_overrides.clear()


def test_wrong_bearer_is_401(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.reports.complete_explanation", AsyncMock(return_value=None))
    store = FakeReportSession()
    client = _client(store)
    try:
        created = client.post("/api/v1/reports", json={"scope": "auto", "displayedStats": _DISPLAYED})
        report_id = created.json()["report_id"]
        wrong = client.get(
            f"/api/v1/reports/{report_id}",
            headers={"Authorization": "Bearer not-the-issued-token-value-at-all-32b"},
        )
        assert wrong.status_code == 401
        expired = store.reports[UUID(report_id)]
        expired.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        late = client.get(
            f"/api/v1/reports/{report_id}",
            headers={"Authorization": f"Bearer {created.json()['access_token']}"},
        )
        assert late.status_code == 404
    finally:
        app.dependency_overrides.clear()
