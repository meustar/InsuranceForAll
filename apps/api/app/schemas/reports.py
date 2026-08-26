"""리포트 POST/GET JSON. 접근 토큰은 POST 응답에만 한 번 둔다."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Scope = Literal["health", "auto", "life"]


class ReportCreateRequest(BaseModel):
    """스코프와 화면에 보여 준 집계. 생년월일은 받지 않는다."""

    model_config = ConfigDict(populate_by_name=True)

    scope: Scope
    displayed_stats: dict[str, Any] = Field(alias="displayedStats")
    masked_coverage: dict[str, Any] | None = Field(default=None, alias="maskedCoverage")


class ReportCreateResponse(BaseModel):
    """원문 접근 토큰은 이때만 내려 보낸다."""

    report_id: UUID
    access_token: str


class ReportGetResponse(BaseModel):
    """조회 본문. 토큰 원문과 생년월일은 넣지 않는다."""

    report_id: UUID
    scope: Scope
    body_markdown: str
    is_fallback: bool
    created_at: datetime
    expires_at: datetime
    input_summary: dict[str, Any]
