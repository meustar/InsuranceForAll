"""상담 POST JSON. 이메일은 요청에만 있고 응답·로그에 되돌려 주지 않는다."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ConsultationCreateRequest(BaseModel):
    """동의와 이메일만 받는다. phone 채널은 거절한다."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    consent_agreed: bool
    consent_notice_version: str
    contact_channel: Literal["email"] = "email"
    email: EmailStr
    purpose_note: str | None = Field(default=None, max_length=2000)


class ConsultationCreateResponse(BaseModel):
    """접수 id와 만료만 알린다. 이메일 원문은 넣지 않는다."""

    id: str
    expires_at: str
    consent_notice_version: str
