"""운영 API JSON. 사용자 통계 프로필 필드는 받지 않는다."""

from pydantic import BaseModel, ConfigDict, Field


class OpsLoginRequest(BaseModel):
    """환경변수에 둔 운영 계정과만 비교한다. PG 사용자 테이블이 아니다."""

    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)
