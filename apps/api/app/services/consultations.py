"""상담 동의 문구와 만료 행 삭제. 사용자 이메일은 여기 두지 않는다."""

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConsultationRequest

NOTICE_PURPOSE = "상담 연락을 위해 이메일과 선택 메모를 암호화해 보관합니다. 통계 탐색에는 연락처가 필요하지 않습니다."
NOTICE_ITEMS = "이메일(필수), 상담 메모(선택)"
NOTICE_RETENTION = "접수일로부터 설정된 보유기간(기본 30일)이 지나면 행을 삭제합니다."
NOTICE_REFUSAL = "동의하지 않으면 상담을 접수하지 않습니다. 통계 조회는 동의 없이 이용할 수 있습니다."


def consent_notice(*, version: str, retention_days: int) -> dict[str, str]:
    """목적·항목·보유기간·거부권을 API로만 내려 준다. 화면은 A-11에서 붙인다."""
    return {
        "version": version,
        "purpose": NOTICE_PURPOSE,
        "items": NOTICE_ITEMS,
        "retention": f"{NOTICE_RETENTION} (현재 {retention_days}일)",
        "refusal": NOTICE_REFUSAL,
        "contact_channel": "email",
    }


async def count_consultations(session: AsyncSession) -> int:
    """UAT #7용으로 행 개수만 센다. 암호문은 읽지 않는다."""
    total = await session.scalar(select(func.count()).select_from(ConsultationRequest))
    return int(total or 0)


async def delete_expired_consultations(session: AsyncSession, *, now: datetime | None = None) -> int:
    """만료시각이 지난 상담 행을 hard delete한다."""
    cutoff = now or datetime.now(timezone.utc)
    result = await session.execute(
        delete(ConsultationRequest).where(ConsultationRequest.expires_at <= cutoff)
    )
    await session.commit()
    return int(result.rowcount or 0)
