from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import get_db
from app.main import app
from app.models import MaskedCoverage, UploadedDocument
from app.session_tokens import COOKIE_NAME, hmac_session_token, issue_session_token

_MIN_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


class FakeDocSession:
    def __init__(self) -> None:
        self.docs: dict[str, UploadedDocument] = {}

    def add(self, obj: UploadedDocument) -> None:
        self.docs[obj.job_id] = obj

    async def commit(self) -> None:
        return None


def _client(store: FakeDocSession) -> TestClient:
    async def override():
        yield store

    app.dependency_overrides[get_db] = override
    return TestClient(app)


def test_upload_returns_202_without_filename(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.routers.documents._staging_path",
        lambda job_id: tmp_path / f"{job_id}.pdf",
    )
    queued = MagicMock()
    monkeypatch.setattr("app.routers.documents.enqueue_mask_document", queued)
    store = FakeDocSession()
    client = _client(store)
    try:
        response = client.post(
            "/api/v1/documents",
            files={"file": ("policy-secret.pdf", _MIN_PDF, "application/pdf")},
        )
        assert response.status_code == 202
        job_id = response.json()["job_id"]
        assert "policy-secret" not in response.text
        assert "original_filename" not in response.text
        queued.assert_called_once_with(job_id)
        assert (tmp_path / f"{job_id}.pdf").is_file()
        doc = store.docs[job_id]
        assert doc.status == "queued"
        assert not hasattr(doc, "original_filename") or getattr(doc, "original_filename", None) is None
        assert response.headers.get("cache-control") == "no-store"
        assert response.cookies.get(COOKIE_NAME)
    finally:
        app.dependency_overrides.clear()


def test_reject_non_pdf_and_oversized(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.routers.documents._staging_path",
        lambda job_id: tmp_path / f"{job_id}.pdf",
    )
    monkeypatch.setattr("app.routers.documents.enqueue_mask_document", MagicMock())
    store = FakeDocSession()
    client = _client(store)
    try:
        bad = client.post(
            "/api/v1/documents",
            files={"file": ("x.bin", b"not-pdf", "application/octet-stream")},
        )
        assert bad.status_code == 400
        huge = client.post(
            "/api/v1/documents",
            files={"file": ("x.pdf", b"%PDF" + b"0" * (10 * 1024 * 1024 + 1), "application/pdf")},
        )
        assert huge.status_code == 413
        assert store.docs == {}
    finally:
        app.dependency_overrides.clear()


def test_get_requires_matching_session(monkeypatch) -> None:
    store = FakeDocSession()
    job_id = uuid4().hex
    token = issue_session_token()
    pepper = get_settings().session_token_pepper.get_secret_value()
    other = issue_session_token()
    doc = UploadedDocument(
        id=uuid4(),
        anon_session_key_hash=hmac_session_token(pepper, token),
        job_id=job_id,
        status="completed",
        byte_size=12,
        page_count=1,
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        fail_code=None,
    )
    doc.masked_coverage = MaskedCoverage(
        id=uuid4(),
        document_id=doc.id,
        coverage_json={"pages": [{"page": 1, "text_masked": "[마스킹]"}]},
        preview_masked="[마스킹]",
        created_at=datetime.now(timezone.utc),
    )
    store.docs[job_id] = doc

    async def fake_get(session, found):
        return session.docs.get(found)

    monkeypatch.setattr("app.routers.documents.get_document_by_job", fake_get)
    client = _client(store)
    try:
        missing = client.get(f"/api/v1/documents/{job_id}")
        assert missing.status_code == 401
        wrong = client.get(f"/api/v1/documents/{job_id}", cookies={COOKIE_NAME: other})
        assert wrong.status_code == 404
        ok = client.get(f"/api/v1/documents/{job_id}", cookies={COOKIE_NAME: token})
        assert ok.status_code == 200
        body = ok.json()
        assert body["status"] == "completed"
        assert "text_raw" not in str(body).lower()
        assert "original_filename" not in str(body)
        assert body["coverage_json"]["pages"][0]["text_masked"] == "[마스킹]"
        assert ok.headers.get("cache-control") == "no-store"
    finally:
        app.dependency_overrides.clear()
