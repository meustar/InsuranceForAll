"""운영자 전용 /api/v1/ops. 사용자 `/`·Header·ifa_anon과 분리한다."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_client import enqueue_mask_document, enqueue_public_sync
from app.config import get_settings
from app.database import get_db
from app.models import UploadedDocument
from app.ops_auth import (
    OPS_COOKIE_NAME,
    bind_ops_cookie,
    credentials_match,
    expire_ops_cookie,
    issue_ops_token,
    ops_token_hash,
    ops_token_valid,
)
from app.schemas.ops import OpsLoginRequest
from app.services.ops import cache_head_summaries, decrypted_consultations, documents_for_hash

router = APIRouter(prefix="/api/v1/ops", tags=["ops"])
_CACHE_CONTROL = "no-store"
_MAX_BYTES = 10 * 1024 * 1024
_PDF_MAGIC = b"%PDF"
_MAX_FILES = 10


def _require_ops(request: Request) -> str:
    """운영 쿠키가 유효할 때만 토큰을 돌려 준다. 사용자 세션으로는 통과하지 않는다."""
    settings = get_settings()
    token = request.cookies.get(OPS_COOKIE_NAME)
    if not ops_token_valid(settings.admin_session_pepper.get_secret_value(), token):
        raise HTTPException(status_code=401, detail="운영 로그인이 필요합니다.")
    return token


@router.post("/session")
def create_ops_session(body: OpsLoginRequest, response: Response) -> dict[str, str]:
    """환경변수 운영 계정과만 비교한다. 실패 본문에 입력값을 되돌려 주지 않는다."""
    response.headers["Cache-Control"] = _CACHE_CONTROL
    settings = get_settings()
    if not settings.admin_session_pepper.get_secret_value().strip():
        raise HTTPException(status_code=503, detail="운영 접속이 설정되지 않았습니다.")
    if not credentials_match(
        username=body.username,
        password=body.password,
        expected_user=settings.admin_username,
        expected_password=settings.admin_password.get_secret_value(),
    ):
        raise HTTPException(status_code=401, detail="운영 접속에 실패했습니다.")
    token = issue_ops_token(settings.admin_session_pepper.get_secret_value())
    bind_ops_cookie(response, token=token, secure=settings.session_cookie_secure)
    return {"status": "ok"}


@router.delete("/session")
def delete_ops_session(response: Response) -> dict[str, str]:
    """운영 쿠키만 만료한다."""
    response.headers["Cache-Control"] = _CACHE_CONTROL
    expire_ops_cookie(response, secure=get_settings().session_cookie_secure)
    return {"status": "ok"}


@router.get("/session")
def get_ops_session(request: Request, response: Response) -> dict[str, bool]:
    """대시보드 진입 전 쿠키만 확인한다."""
    response.headers["Cache-Control"] = _CACHE_CONTROL
    _require_ops(request)
    return {"authenticated": True}


@router.get("/dashboard")
async def get_ops_dashboard(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """캐시 head·상담 복호화·운영 PDF job. GA4·생년월일은 없다."""
    response.headers["Cache-Control"] = _CACHE_CONTROL
    token = _require_ops(request)
    settings = get_settings()
    secret = settings.contact_encryption_key.get_secret_value()
    pepper = settings.admin_session_pepper.get_secret_value()
    return {
        "cache_heads": await cache_head_summaries(session),
        "consultations": await decrypted_consultations(session, secret=secret),
        "documents": await documents_for_hash(session, key_hash=ops_token_hash(pepper, token)),
    }


@router.post("/sync")
def post_ops_sync(request: Request, response: Response) -> dict[str, str]:
    """F-11 배치를 큐에만 넣는다. seed·포털 키는 응답에 없다."""
    response.headers["Cache-Control"] = _CACHE_CONTROL
    _require_ops(request)
    enqueue_public_sync()
    return {"status": "queued"}


@router.post("/documents")
async def post_ops_documents(
    request: Request,
    files: list[UploadFile] = File(...),
    session: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """다건 PDF. 원본 파일명은 저장하지 않고 기존 마스킹 큐를 쓴다."""
    token = _require_ops(request)
    if len(files) > _MAX_FILES:
        raise HTTPException(status_code=400, detail="한 번에 10개까지 올릴 수 있습니다.")
    settings = get_settings()
    pepper = settings.admin_session_pepper.get_secret_value()
    key_hash = ops_token_hash(pepper, token)
    job_ids: list[str] = []
    now = datetime.now(timezone.utc)
    root = Path(settings.document_staging_dir)
    root.mkdir(parents=True, exist_ok=True)
    for upload in files:
        payload = await upload.read(_MAX_BYTES + 1)
        if len(payload) > _MAX_BYTES:
            raise HTTPException(status_code=413, detail="PDF는 10MB 이하여야 합니다.")
        if not payload.startswith(_PDF_MAGIC):
            raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
        job_id = uuid4().hex
        path = root / f"{job_id}.pdf"
        path.write_bytes(payload)
        session.add(
            UploadedDocument(
                id=uuid4(),
                anon_session_key_hash=key_hash,
                job_id=job_id,
                status="queued",
                byte_size=len(payload),
                page_count=None,
                created_at=now,
                expires_at=now + timedelta(hours=settings.document_result_retention_hours),
                fail_code=None,
            )
        )
        job_ids.append(job_id)
        try:
            await session.commit()
        except Exception:
            path.unlink(missing_ok=True)
            raise
        enqueue_mask_document(job_id)
    body = JSONResponse(
        status_code=202,
        content={"job_ids": job_ids},
        headers={"Cache-Control": _CACHE_CONTROL},
    )
    bind_ops_cookie(body, token=token, secure=settings.session_cookie_secure)
    return body
