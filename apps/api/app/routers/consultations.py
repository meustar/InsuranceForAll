"""POST /api/v1/consultations — 동의 후 이메일만 AES-GCM으로 저장한다."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import ConsultationRequest
from app.schemas.consultations import ConsultationCreateRequest, ConsultationCreateResponse
from app.services.aead import encrypt_field
from app.services.consultations import consent_notice, delete_expired_consultations
from app.services.notify import send_advisor_notice
from app.session_tokens import COOKIE_NAME, bind_session_cookie, hmac_session_token

router = APIRouter(prefix="/api/v1", tags=["consultations"])
_CACHE_CONTROL = "no-store"


@router.get("/consultations/notice")
def get_consultation_notice(request: Request, response: Response) -> dict[str, str]:
    """목적·항목·보유기간·거부권 문구. 개인정보는 없다."""
    settings = get_settings()
    bind_session_cookie(request, response, secure=settings.session_cookie_secure)
    return consent_notice(
        version=settings.consultation_consent_notice_version,
        retention_days=settings.consultation_retention_days,
    )


@router.post("/consultations", response_model=ConsultationCreateResponse, status_code=201)
async def create_consultation(
    request: Request,
    response: Response,
    body: ConsultationCreateRequest,
    session: AsyncSession = Depends(get_db),
) -> ConsultationCreateResponse:
    """동의·이메일만 검증해 암호문으로 INSERT한다. phone은 스키마에서 거절한다."""
    response.headers["Cache-Control"] = _CACHE_CONTROL
    settings = get_settings()
    if not body.consent_agreed:
        raise HTTPException(status_code=400, detail="상담 접수에는 동의 확인이 필요합니다.")
    if body.consent_notice_version != settings.consultation_consent_notice_version:
        raise HTTPException(status_code=409, detail="동의문 버전이 현재 고지와 다릅니다.")
    await delete_expired_consultations(session)
    now = datetime.now(timezone.utc)
    secret = settings.contact_encryption_key.get_secret_value()
    note = (body.purpose_note or "").strip() or None
    cookie = request.cookies.get(COOKIE_NAME)
    session_hash = None
    if cookie and len(cookie.encode("utf-8")) >= 32:
        session_hash = hmac_session_token(settings.session_token_pepper.get_secret_value(), cookie)
    row = ConsultationRequest(
        id=uuid4(),
        consent_agreed=True,
        consented_at=now,
        consent_notice_version=settings.consultation_consent_notice_version,
        contact_encrypted=encrypt_field(secret, str(body.email)),
        contact_channel="email",
        purpose_note_encrypted=None if note is None else encrypt_field(secret, note),
        encryption_key_version=settings.encryption_key_version,
        anon_session_key_hash=session_hash,
        created_at=now,
        expires_at=now + timedelta(days=settings.consultation_retention_days),
    )
    session.add(row)
    await session.commit()
    # 평문 이메일·메모는 운영 SMTP에만 넘긴다. 응답·로그에는 넣지 않는다.
    send_advisor_notice(str(body.email), note)
    bind_session_cookie(request, response, secure=settings.session_cookie_secure)
    return ConsultationCreateResponse(
        id=str(row.id),
        expires_at=row.expires_at.isoformat(),
        consent_notice_version=row.consent_notice_version,
    )
