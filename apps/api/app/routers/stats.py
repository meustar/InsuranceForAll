"""POST /api/v1/stats/* — 캐시만 읽고 생년월일은 보험나이 계산 뒤 버린다."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.insurance_age import (
    AUTO_SAMPLE_INSUFFICIENT,
    age_band_auto,
    age_band_life,
    insurance_age,
)
from app.schemas.stats import StatsRequest, StatsResponse
from app.services.stats_query import load_cache_bundle, query_auto, query_health, query_life
from app.session_tokens import bind_session_cookie

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])

_SEOUL = ZoneInfo("Asia/Seoul")
_DISCLAIMER = "공공 통계를 참고용으로 보여 줍니다. 가입을 권하거나 개인 보험료를 확정하지 않습니다."
_STALE_MESSAGE = "최근 동기화가 실패해 이전 캐시를 보여 줍니다. 수치는 최신이 아닐 수 있습니다."
_CACHE_CONTROL = "no-store"
Scope = Literal["health", "auto", "life"]
_PROFILE_QUERY_KEYS = frozenset(
    {
        "birth_date",
        "birthdate",
        "birthDate",
        "sex",
        "area_nm",
        "areaNm",
        "region",
    }
)


def _as_of_date() -> date:
    return datetime.now(_SEOUL).date()


def reject_profile_query(request: Request) -> None:
    """생년월일·성별·지역을 URL에 실으면 거절한다. 값 자체는 오류 문구에 넣지 않는다."""
    for key in request.query_params:
        if key in _PROFILE_QUERY_KEYS:
            raise HTTPException(status_code=400, detail="프로필은 JSON 본문으로만 전달합니다.")


def _compute_age(body: StatsRequest, as_of: date) -> int:
    """보험나이를 구한 뒤 생년월일 바인딩을 더 이상 쓰지 않는다."""
    birth = body.birth_date
    if birth > as_of:
        raise HTTPException(status_code=422, detail="생년월일이 이용일보다 이후입니다.")
    return insurance_age(birth, as_of)


async def _require_bundle(session: AsyncSession, scope: Scope):
    bundle = await load_cache_bundle(session, scope)
    if bundle is None:
        raise HTTPException(
            status_code=503,
            detail="통계 캐시가 없습니다. 배치 동기화 이후 다시 시도해 주세요.",
        )
    return bundle


def _stale_fields(stale: bool) -> tuple[bool, str | None]:
    if stale:
        return True, _STALE_MESSAGE
    return False, None


@router.post("/health", response_model=StatsResponse)
async def post_health(
    request: Request,
    response: Response,
    body: StatsRequest,
    session: AsyncSession = Depends(get_db),
) -> StatsResponse:
    """실손 캐시를 age로 조회한다. 요청 중 포털을 부르지 않는다."""
    reject_profile_query(request)
    response.headers["Cache-Control"] = _CACHE_CONTROL
    as_of = _as_of_date()
    age = _compute_age(body, as_of)
    sex = body.sex
    area_nm = body.area_nm
    ptrn = body.ptrn
    mog = body.mog
    bundle = await _require_bundle(session, "health")
    rows, total, truncated = await query_health(
        session, sync_run_id=bundle.sync_run_id, age=age, ptrn=ptrn, mog=mog
    )
    stale, stale_message = _stale_fields(bundle.stale)
    payload = StatsResponse(
        scope="health",
        stale=stale,
        stale_message=stale_message,
        as_of_date=as_of,
        insurance_age=age,
        adapter={"age": age},
        sex=sex,
        area_nm=area_nm,
        base_period=bundle.base_period,
        source="medical",
        row_count=total,
        truncated=truncated,
        rows=rows,
        disclaimer=_DISCLAIMER,
    )
    bind_session_cookie(request, response, secure=get_settings().session_cookie_secure)
    return payload


@router.post("/auto", response_model=StatsResponse)
async def post_auto(
    request: Request,
    response: Response,
    body: StatsRequest,
    session: AsyncSession = Depends(get_db),
) -> StatsResponse:
    """자동차 캐시를 aggr·성별로 조회한다. 요청 중 포털을 부르지 않는다."""
    reject_profile_query(request)
    response.headers["Cache-Control"] = _CACHE_CONTROL
    as_of = _as_of_date()
    age = _compute_age(body, as_of)
    sex = body.sex
    area_nm = body.area_nm
    aggr = age_band_auto(age)
    note = (
        "해당 보험나이는 자동차 연령대 표본이 부족할 수 있습니다."
        if aggr == AUTO_SAMPLE_INSUFFICIENT
        else None
    )
    bundle = await _require_bundle(session, "auto")
    rows, total, truncated = await query_auto(
        session,
        sync_run_id=bundle.sync_run_id,
        aggr=aggr,
        sex_nm=sex,
        isu_itms_nm=body.isu_itms_nm,
        mog_clsf_nm=body.mog_clsf_nm,
        atmb_plor_nm=body.atmb_plor_nm,
        kncr_nm=body.kncr_nm,
    )
    stale, stale_message = _stale_fields(bundle.stale)
    payload = StatsResponse(
        scope="auto",
        stale=stale,
        stale_message=stale_message,
        as_of_date=as_of,
        insurance_age=age,
        adapter={"aggr": aggr},
        sex=sex,
        area_nm=area_nm,
        base_period=bundle.base_period,
        source="auto",
        row_count=total,
        truncated=truncated,
        rows=rows,
        disclaimer=_DISCLAIMER,
        adapter_note=note,
    )
    bind_session_cookie(request, response, secure=get_settings().session_cookie_secure)
    return payload


@router.post("/life", response_model=StatsResponse)
async def post_life(
    request: Request,
    response: Response,
    body: StatsRequest,
    session: AsyncSession = Depends(get_db),
) -> StatsResponse:
    """생명 캐시를 도달연령·지역으로 조회하고 남·여 행을 함께 돌려 덤벨에 쓴다."""
    reject_profile_query(request)
    response.headers["Cache-Control"] = _CACHE_CONTROL
    as_of = _as_of_date()
    age = _compute_age(body, as_of)
    sex = body.sex
    area_nm = body.area_nm
    rchn = age_band_life(age)
    bundle = await _require_bundle(session, "life")
    rows, total, truncated = await query_life(
        session,
        sync_run_id=bundle.sync_run_id,
        rchn_aggr=rchn,
        sex_nm=sex,
        area_nm=area_nm,
        isu_kind_nm=body.isu_kind_nm,
        stts_accml_trgt_yr=body.stts_accml_trgt_yr,
    )
    stale, stale_message = _stale_fields(bundle.stale)
    payload = StatsResponse(
        scope="life",
        stale=stale,
        stale_message=stale_message,
        as_of_date=as_of,
        insurance_age=age,
        adapter={"rchnAggr": rchn, "areaNm": area_nm},
        sex=sex,
        area_nm=area_nm,
        base_period=bundle.base_period,
        source="life",
        row_count=total,
        truncated=truncated,
        rows=rows,
        disclaimer=_DISCLAIMER,
    )
    bind_session_cookie(request, response, secure=get_settings().session_cookie_secure)
    return payload
