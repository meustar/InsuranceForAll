"""POST/GET /api/v1/documents — PDF 검증 후 job만 남기고 원본 파일명은 저장하지 않는다."""

from __future__ import annotations

import hmac
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_client import enqueue_mask_document
from app.config import get_settings
from app.database import get_db
from app.models import UploadedDocument
from app.schemas.documents import DocumentGetResponse
from app.services.documents import get_document_by_job
from app.session_tokens import COOKIE_NAME, bind_session_cookie, hmac_session_token, issue_session_token

router = APIRouter(prefix="/api/v1", tags=["documents"])

_CACHE_CONTROL = "no-store"
_MAX_BYTES = 10 * 1024 * 1024
_PDF_MAGIC = b"%PDF"


def _hash_matches(stored: bytes, computed: bytes) -> bool:
    if len(stored) != len(computed):
        return False
    return hmac.compare_digest(stored, computed)


def _staging_path(job_id: str) -> Path:
    root = Path(get_settings().document_staging_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root / f"{job_id}.pdf"


@router.post("/documents")
async def create_document(
    request: Request,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """형식·크기만 검사하고 202와 job_id를 준다. 업로드 파일명은 버린다."""
    payload = await file.read(_MAX_BYTES + 1)
    if len(payload) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="PDF는 10MB 이하여야 합니다.")
    if not payload.startswith(_PDF_MAGIC):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
    settings = get_settings()
    existing = request.cookies.get(COOKIE_NAME)
    cookie_token = (
        existing if existing and len(existing.encode("utf-8")) >= 32 else issue_session_token()
    )
    job_id = uuid4().hex
    path = _staging_path(job_id)
    path.write_bytes(payload)
    now = datetime.now(timezone.utc)
    document = UploadedDocument(
        id=uuid4(),
        anon_session_key_hash=hmac_session_token(
            settings.session_token_pepper.get_secret_value(), cookie_token
        ),
        job_id=job_id,
        status="queued",
        byte_size=len(payload),
        page_count=None,
        created_at=now,
        expires_at=now + timedelta(hours=settings.document_result_retention_hours),
        fail_code=None,
    )
    session.add(document)
    try:
        await session.commit()
    except Exception:
        path.unlink(missing_ok=True)
        raise
    enqueue_mask_document(job_id)
    body = JSONResponse(
        status_code=202,
        content={"job_id": job_id},
        headers={"Cache-Control": _CACHE_CONTROL},
    )
    bind_session_cookie(request, body, secure=settings.session_cookie_secure, token=cookie_token)
    return body


@router.get("/documents/{job_id}", response_model=DocumentGetResponse)
async def get_document(
    job_id: str,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> DocumentGetResponse:
    """쿠키 HMAC이 같은 job만 상태·마스킹 JSON을 보여 준다."""
    response.headers["Cache-Control"] = _CACHE_CONTROL
    cookie = request.cookies.get(COOKIE_NAME)
    if not cookie:
        raise HTTPException(status_code=401, detail="문서 조회에는 익명 세션 쿠키가 필요합니다.")
    document = await get_document_by_job(session, job_id)
    if document is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    expected = hmac_session_token(get_settings().session_token_pepper.get_secret_value(), cookie)
    if not _hash_matches(document.anon_session_key_hash, expected):
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    now = datetime.now(timezone.utc)
    expires = document.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires <= now:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    coverage = document.masked_coverage
    bind_session_cookie(
        request,
        response,
        secure=get_settings().session_cookie_secure,
        token=cookie,
    )
    return DocumentGetResponse(
        job_id=document.job_id,
        status=document.status,
        byte_size=document.byte_size,
        page_count=document.page_count,
        fail_code=document.fail_code,
        coverage_json=None if coverage is None else coverage.coverage_json,
        preview_masked=None if coverage is None else coverage.preview_masked,
    )
