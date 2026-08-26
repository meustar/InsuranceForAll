"""문서 업로드 응답. 원본 파일명과 PDF 원문은 넣지 않는다."""

from typing import Any, Literal

from pydantic import BaseModel

DocumentStatus = Literal["queued", "processing", "completed", "failed"]


class DocumentCreateResponse(BaseModel):
    """접수만 알린다. 마스킹은 worker가 끝낸 뒤 GET으로 본다."""

    job_id: str


class DocumentGetResponse(BaseModel):
    """세션 HMAC이 맞는 job의 상태와 마스킹 JSON만 반환한다."""

    job_id: str
    status: str
    byte_size: int | None
    page_count: int | None
    fail_code: str | None
    coverage_json: dict[str, Any] | None
    preview_masked: str | None
