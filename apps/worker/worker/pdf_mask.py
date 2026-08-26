"""증권 PDF 텍스트를 마스킹한다. 원문·파일명은 JSON에 남기지 않는다."""

from __future__ import annotations

import re
from pathlib import Path

_MAX_PAGES = 30
_RRN = re.compile(r"\d{6}[-\s]?\d{7}")
_PHONE = re.compile(r"01[016789][-\s]?\d{3,4}[-\s]?\d{4}")
_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_MASK = "[마스킹]"
_UNMASKED_KEYS = frozenset({"raw_pdf", "text_raw", "unmasked", "original_filename"})


def mask_text(value: str) -> str:
    """주민번호·전화·이메일 패턴을 가린다. 원문은 반환하지 않는다."""
    text = _RRN.sub(_MASK, value)
    text = _PHONE.sub(_MASK, text)
    text = _EMAIL.sub(_MASK, text)
    return text


def extract_masked_pages(pdf_bytes: bytes) -> tuple[list[dict], int]:
    """페이지 텍스트를 꺼낸 뒤 바로 마스킹한다. OCR은 하지 않는다."""
    import fitz

    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page_count = document.page_count
        if page_count > _MAX_PAGES:
            raise ValueError("TOO_MANY_PAGES")
        pages: list[dict] = []
        for index, page in enumerate(document, start=1):
            masked = mask_text(page.get_text() or "")
            pages.append({"page": index, "text_masked": masked})
        return pages, page_count
    finally:
        document.close()


def _assert_masked_payload(payload: dict) -> None:
    dumped = str(payload).lower()
    for key in _UNMASKED_KEYS:
        if key in dumped:
            raise ValueError("UNMASKED_FIELD")


def run_mask(job_id: str) -> dict[str, str]:
    """스테이징 파일을 읽어 마스킹 JSON을 저장하고 원본 파일을 지운다."""
    import uuid
    from datetime import datetime, timezone

    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session, selectinload

    from app.db import sync_database_url
    from app.models import MaskedCoverage, UploadedDocument
    from worker.config import get_settings

    settings = get_settings()
    path = Path(settings.document_staging_dir) / f"{job_id}.pdf"
    engine = create_engine(sync_database_url(settings.database_url.get_secret_value()))
    now = datetime.now(timezone.utc)
    try:
        with Session(engine) as session:
            document = session.scalar(
                select(UploadedDocument)
                .options(selectinload(UploadedDocument.masked_coverage))
                .where(UploadedDocument.job_id == job_id)
            )
            if document is None:
                return {"status": "missing"}
            document.status = "processing"
            session.commit()
            if not path.is_file():
                document.status = "failed"
                document.fail_code = "STAGING_MISSING"
                session.commit()
                return {"status": "failed"}
            try:
                pages, page_count = extract_masked_pages(path.read_bytes())
            except ValueError as exc:
                document.status = "failed"
                document.fail_code = str(exc)[:64]
                session.commit()
                return {"status": "failed"}
            except Exception:
                document.status = "failed"
                document.fail_code = "INVALID_PDF"
                session.commit()
                return {"status": "failed"}
            preview = " ".join(page["text_masked"] for page in pages).strip()[:400]
            coverage = {
                "page_count": page_count,
                "pages": pages,
                "mask_rules": ["rrn", "phone", "email"],
            }
            _assert_masked_payload(coverage)
            document.page_count = page_count
            document.status = "completed"
            document.fail_code = None
            if document.masked_coverage is None:
                session.add(
                    MaskedCoverage(
                        id=uuid.uuid4(),
                        document_id=document.id,
                        coverage_json=coverage,
                        preview_masked=preview or None,
                        created_at=now,
                    )
                )
            else:
                document.masked_coverage.coverage_json = coverage
                document.masked_coverage.preview_masked = preview or None
            session.commit()
            return {"status": "completed"}
    finally:
        path.unlink(missing_ok=True)
        engine.dispose()
