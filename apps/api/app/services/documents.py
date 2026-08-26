"""업로드 job 조회. 원본 파일명 컬럼은 쓰지 않는다."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import UploadedDocument


async def get_document_by_job(session: AsyncSession, job_id: str) -> UploadedDocument | None:
    """job_id로 문서와 마스킹 결과를 함께 읽는다."""
    stmt = (
        select(UploadedDocument)
        .options(selectinload(UploadedDocument.masked_coverage))
        .where(UploadedDocument.job_id == job_id)
    )
    return await session.scalar(stmt)
