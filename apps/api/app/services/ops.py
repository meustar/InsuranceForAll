"""운영 대시보드 조회. 복호화 결과는 호출 측에만 두고 로그하지 않는다."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import ConsultationRequest, PublicCacheHead, UploadedDocument
from app.services.aead import decrypt_field


async def cache_head_summaries(session: AsyncSession) -> list[dict[str, object]]:
    """활성 캐시 head만. 포털 키는 넣지 않는다."""
    result = await session.execute(select(PublicCacheHead).options(selectinload(PublicCacheHead.active_sync_run)))
    heads = []
    for row in result.scalars().all():
        run = row.active_sync_run
        heads.append(
            {
                "source": row.source,
                "stale": row.stale,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "base_period": run.base_period if run else None,
                "sync_status": run.status if run else None,
            }
        )
    return heads


async def decrypted_consultations(session: AsyncSession, *, secret: str) -> list[dict[str, object]]:
    """만료되지 않은 상담만 복호화한다. 생년월일은 테이블에 없다."""
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(ConsultationRequest)
        .where(ConsultationRequest.expires_at > now)
        .order_by(ConsultationRequest.created_at.desc())
        .limit(100)
    )
    items = []
    for row in result.scalars().all():
        note = None
        if row.purpose_note_encrypted:
            note = decrypt_field(secret, row.purpose_note_encrypted)
        items.append(
            {
                "id": str(row.id),
                "contact_channel": row.contact_channel,
                "email": decrypt_field(secret, row.contact_encrypted),
                "purpose_note": note,
                "created_at": row.created_at.isoformat(),
                "expires_at": row.expires_at.isoformat(),
            }
        )
    return items


async def documents_for_hash(session: AsyncSession, *, key_hash: bytes) -> list[dict[str, object]]:
    """운영 쿠키 HMAC에 묶인 PDF job만. 원본 파일명은 스키마에 없다."""
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(UploadedDocument)
        .where(
            UploadedDocument.anon_session_key_hash == key_hash,
            UploadedDocument.expires_at > now,
        )
        .order_by(UploadedDocument.created_at.desc())
        .limit(50)
    )
    return [
        {
            "job_id": row.job_id,
            "status": row.status,
            "byte_size": row.byte_size,
            "fail_code": row.fail_code,
        }
        for row in result.scalars().all()
    ]
