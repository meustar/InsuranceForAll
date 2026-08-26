import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

from fastapi.testclient import TestClient

import pytest

from app.config import get_settings
from app.database import get_db
from app.main import app
from app.models import ConsultationRequest
from app.services.aead import decrypt_field, encrypt_field
from app.services.consultations import consent_notice, delete_expired_consultations

_APPLICANT = "applicant@example.com"


class FakeConsultSession:
    def __init__(self) -> None:
        self.rows: list[ConsultationRequest] = []

    def add(self, obj: ConsultationRequest) -> None:
        self.rows.append(obj)

    async def commit(self) -> None:
        return None


def _client(store: FakeConsultSession) -> TestClient:
    async def override():
        yield store

    app.dependency_overrides[get_db] = override
    return TestClient(app)


def _payload(**extra):
    settings = get_settings()
    body = {
        "consent_agreed": True,
        "consent_notice_version": settings.consultation_consent_notice_version,
        "contact_channel": "email",
        "email": _APPLICANT,
        "purpose_note": "통계 화면을 보고 질문이 있습니다.",
    }
    body.update(extra)
    return body


def test_notice_covers_uat9_fields() -> None:
    notice = consent_notice(version="2026-08-25", retention_days=30)
    text = " ".join(notice.values())
    assert "목적" in notice["purpose"] or "상담" in notice["purpose"]
    assert "이메일" in notice["items"]
    assert "30" in notice["retention"]
    assert "동의하지 않으면" in notice["refusal"]
    assert notice["contact_channel"] == "email"
    assert "전화" not in notice["items"]
    client = TestClient(app)
    response = client.get("/api/v1/consultations/notice")
    assert response.status_code == 200
    body = response.json()
    assert body["contact_channel"] == "email"
    assert "거부" in body["refusal"] or "동의하지 않으면" in body["refusal"]
    assert _APPLICANT not in response.text


def test_aead_roundtrip_and_blob_hides_plaintext() -> None:
    pytest.importorskip("cryptography")
    secret = get_settings().contact_encryption_key.get_secret_value()
    blob = encrypt_field(secret, _APPLICANT)
    assert _APPLICANT.encode() not in blob
    assert decrypt_field(secret, blob) == _APPLICANT


def test_refuse_consent_and_phone_leave_table_empty(monkeypatch) -> None:
    monkeypatch.setattr("app.routers.consultations.delete_expired_consultations", AsyncMock(return_value=0))
    monkeypatch.setattr("app.routers.consultations.send_advisor_notice", MagicMock())
    store = FakeConsultSession()
    client = _client(store)
    try:
        refused = client.post("/api/v1/consultations", json=_payload(consent_agreed=False))
        assert refused.status_code == 400
        phone = client.post("/api/v1/consultations", json=_payload(contact_channel="phone"))
        assert phone.status_code == 422
        assert store.rows == []
        assert _APPLICANT not in refused.text
    finally:
        app.dependency_overrides.clear()


def test_create_encrypts_and_notify_omits_applicant(monkeypatch) -> None:
    pytest.importorskip("cryptography")
    monkeypatch.setattr("app.routers.consultations.delete_expired_consultations", AsyncMock(return_value=0))
    sent = MagicMock()
    monkeypatch.setattr("app.routers.consultations.send_advisor_notice", sent)
    store = FakeConsultSession()
    client = _client(store)
    try:
        created = client.post("/api/v1/consultations", json=_payload())
        assert created.status_code == 201
        assert created.headers.get("cache-control") == "no-store"
        data = created.json()
        assert _APPLICANT not in created.text
        assert "email" not in data
        row = store.rows[0]
        assert row.contact_channel == "email"
        assert row.consent_agreed is True
        assert _APPLICANT.encode() not in row.contact_encrypted
        secret = get_settings().contact_encryption_key.get_secret_value()
        assert decrypt_field(secret, row.contact_encrypted) == _APPLICANT
        sent.assert_called_once()
        assert sent.call_args.args[0] == UUID(data["id"])
    finally:
        app.dependency_overrides.clear()


def test_notify_body_has_no_applicant_email(monkeypatch) -> None:
    captured = {}

    class DummySmtp:
        def __init__(self, *args, **kwargs):
            return None

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def starttls(self):
            return None

        def login(self, *args):
            return None

        def send_message(self, message):
            captured["body"] = message.get_content()
            captured["to"] = str(message["To"])

    monkeypatch.setattr("app.services.notify.smtplib.SMTP", DummySmtp)
    monkeypatch.setattr(
        "app.services.notify.get_settings",
        lambda: type(
            "S",
            (),
            {
                "consultation_notify_email": "advisor@example.com",
                "smtp_host": "localhost",
                "smtp_port": 587,
                "smtp_from": "noreply@example.com",
                "smtp_user": "",
                "smtp_password": type("P", (), {"get_secret_value": lambda self: ""})(),
            },
        )(),
    )
    from uuid import uuid4

    from app.services.notify import send_advisor_notice

    send_advisor_notice(uuid4())
    assert _APPLICANT not in captured.get("body", "")
    assert "advisor@example.com" == captured.get("to")


def test_delete_expired_consultations() -> None:
    session = MagicMock()
    result = MagicMock(rowcount=1)
    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()
    deleted = asyncio.run(
        delete_expired_consultations(session, now=datetime.now(timezone.utc) + timedelta(days=1))
    )
    assert deleted == 1
    session.execute.assert_awaited()
    session.commit.assert_awaited()
