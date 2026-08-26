"""통계 POST JSON. 생년월일은 본문에만 두고 응답·URL에 되돌려 주지 않는다."""

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

LIFE_AREA_NAMES = frozenset(
    {
        "서울",
        "부산",
        "대구",
        "인천",
        "광주",
        "대전",
        "울산",
        "세종",
        "경기",
        "강원",
        "충북",
        "충남",
        "전북",
        "전남",
        "경북",
        "경남",
        "제주",
    }
)

Sex = Literal["남자", "여자"]


class StatsRequest(BaseModel):
    """공통 프로필과 스코프 선택 필터. extra는 직업·유병력 등을 받아도 버린다."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    birth_date: date = Field(alias="birthDate")
    sex: Sex
    area_nm: str = Field(alias="areaNm")
    ptrn: str | None = None
    mog: str | None = None
    isu_itms_nm: str | None = Field(default=None, alias="isuItmsNm")
    mog_clsf_nm: str | None = Field(default=None, alias="mogClsfNm")
    atmb_plor_nm: str | None = Field(default=None, alias="atmbPlorNm")
    kncr_nm: str | None = Field(default=None, alias="kncrNm")
    isu_kind_nm: str | None = Field(default=None, alias="isuKindNm")
    stts_accml_trgt_yr: str | None = Field(default=None, alias="sttsAccmlTrgtYr")

    @field_validator("birth_date")
    @classmethod
    def birth_not_placeholder_range(cls, value: date) -> date:
        if value.year < 1900:
            raise ValueError("birth_out_of_range")
        return value

    @field_validator("area_nm")
    @classmethod
    def area_is_life_enum(cls, value: str) -> str:
        trimmed = value.strip()
        if trimmed not in LIFE_AREA_NAMES:
            raise ValueError("unknown_area")
        return trimmed


class StatsResponse(BaseModel):
    """캐시 조회 결과. 생년월일 원문은 넣지 않는다."""

    scope: Literal["health", "auto", "life"]
    stale: bool
    stale_message: str | None
    as_of_date: date
    insurance_age: int
    adapter: dict[str, Any]
    sex: Sex
    area_nm: str
    base_period: str
    source: str
    row_count: int
    truncated: bool
    rows: list[dict[str, Any]]
    disclaimer: str
    adapter_note: str | None = None
