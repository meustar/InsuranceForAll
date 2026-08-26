"""활성 public_cache_heads만 읽어 stats_*를 조회한다. 포털 HTTP는 호출하지 않는다."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    PublicCacheHead,
    PublicSyncRun,
    StatsAutoContract,
    StatsLifeJoinStatus,
    StatsMedicalRate,
)

ROW_LIMIT = 200
SOURCE_BY_SCOPE = {"health": "medical", "auto": "auto", "life": "life"}


@dataclass
class CacheBundle:
    """head와 성공 run 메타. stale이어도 이전 성공 캐시를 그대로 쓴다."""

    stale: bool
    base_period: str
    sync_run_id: UUID


def _num(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return format(value, "f")


async def load_cache_bundle(session: AsyncSession, scope: str) -> CacheBundle | None:
    """화면용 활성 포인터가 없으면 None. 실패 head는 만들지 않고 조회만 한다."""
    source = SOURCE_BY_SCOPE[scope]
    stmt = (
        select(PublicCacheHead, PublicSyncRun)
        .join(PublicSyncRun, PublicCacheHead.active_sync_run_id == PublicSyncRun.id)
        .where(PublicCacheHead.source == source)
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        return None
    head, run = row
    return CacheBundle(stale=head.stale, base_period=run.base_period, sync_run_id=run.id)


async def query_health(
    session: AsyncSession,
    *,
    sync_run_id: UUID,
    age: int,
    ptrn: str | None,
    mog: str | None,
) -> tuple[list[dict[str, Any]], int, bool]:
    """실손 age 정수로 상품 행을 고른다."""
    filters = [
        StatsMedicalRate.sync_run_id == sync_run_id,
        StatsMedicalRate.age == age,
    ]
    if ptrn:
        filters.append(StatsMedicalRate.ptrn == ptrn)
    if mog:
        filters.append(StatsMedicalRate.mog == mog)
    total = await session.scalar(select(func.count()).select_from(StatsMedicalRate).where(*filters))
    total_n = int(total or 0)
    stmt = (
        select(StatsMedicalRate)
        .where(*filters)
        .order_by(StatsMedicalRate.cmpy_nm, StatsMedicalRate.prd_nm)
        .limit(ROW_LIMIT)
    )
    records = (await session.execute(stmt)).scalars().all()
    rows = [
        {
            "cmpy_cd": r.cmpy_cd,
            "cmpy_nm": r.cmpy_nm,
            "ptrn": r.ptrn,
            "mog": r.mog,
            "prd_nm": r.prd_nm,
            "age": r.age,
            "ml_ins_rt": _num(r.ml_ins_rt),
            "fml_ins_rt": _num(r.fml_ins_rt),
            "ofr_inst_nm": r.ofr_inst_nm,
            "bas_dt": r.bas_dt.isoformat(),
        }
        for r in records
    ]
    return rows, total_n, total_n > ROW_LIMIT


async def query_auto(
    session: AsyncSession,
    *,
    sync_run_id: UUID,
    aggr: str,
    sex_nm: str,
    isu_itms_nm: str | None,
    mog_clsf_nm: str | None,
    atmb_plor_nm: str | None,
    kncr_nm: str | None,
) -> tuple[list[dict[str, Any]], int, bool]:
    """자동차 aggr·성별로 계약 집계를 고른다."""
    filters = [
        StatsAutoContract.sync_run_id == sync_run_id,
        StatsAutoContract.aggr == aggr,
        StatsAutoContract.sex_nm == sex_nm,
    ]
    if isu_itms_nm:
        filters.append(StatsAutoContract.isu_itms_nm == isu_itms_nm)
    if mog_clsf_nm:
        filters.append(StatsAutoContract.mog_clsf_nm == mog_clsf_nm)
    if atmb_plor_nm:
        filters.append(StatsAutoContract.atmb_plor_nm == atmb_plor_nm)
    if kncr_nm:
        filters.append(StatsAutoContract.kncr_nm == kncr_nm)
    total = await session.scalar(select(func.count()).select_from(StatsAutoContract).where(*filters))
    total_n = int(total or 0)
    stmt = (
        select(StatsAutoContract)
        .where(*filters)
        .order_by(StatsAutoContract.isu_itms_nm, StatsAutoContract.mog_clsf_nm)
        .limit(ROW_LIMIT)
    )
    records = (await session.execute(stmt)).scalars().all()
    rows = [
        {
            "isu_cmpy_ofr_ym": r.isu_cmpy_ofr_ym,
            "isu_itms_nm": r.isu_itms_nm,
            "mog_clsf_nm": r.mog_clsf_nm,
            "sex_nm": r.sex_nm,
            "aggr": r.aggr,
            "atmb_plor_nm": r.atmb_plor_nm,
            "kncr_nm": r.kncr_nm,
            "join_cnt": r.join_cnt,
            "elps_inpm": _num(r.elps_inpm),
        }
        for r in records
    ]
    return rows, total_n, total_n > ROW_LIMIT


async def query_life(
    session: AsyncSession,
    *,
    sync_run_id: UUID,
    rchn_aggr: str,
    sex_nm: str,
    area_nm: str,
    isu_kind_nm: str | None,
    stts_accml_trgt_yr: str | None,
) -> tuple[list[dict[str, Any]], int, bool]:
    """생명 도달연령·성별·지역으로 가입현황을 고른다."""
    filters = [
        StatsLifeJoinStatus.sync_run_id == sync_run_id,
        StatsLifeJoinStatus.rchn_aggr == rchn_aggr,
        StatsLifeJoinStatus.sex_nm == sex_nm,
        StatsLifeJoinStatus.area_nm == area_nm,
    ]
    if isu_kind_nm:
        filters.append(StatsLifeJoinStatus.isu_kind_nm == isu_kind_nm)
    if stts_accml_trgt_yr:
        filters.append(StatsLifeJoinStatus.stts_accml_trgt_yr == stts_accml_trgt_yr)
    total = await session.scalar(
        select(func.count()).select_from(StatsLifeJoinStatus).where(*filters)
    )
    total_n = int(total or 0)
    stmt = (
        select(StatsLifeJoinStatus)
        .where(*filters)
        .order_by(StatsLifeJoinStatus.isu_kind_nm)
        .limit(ROW_LIMIT)
    )
    records = (await session.execute(stmt)).scalars().all()
    rows = [
        {
            "stts_accml_trgt_yr": r.stts_accml_trgt_yr,
            "area_nm": r.area_nm,
            "sex_nm": r.sex_nm,
            "rchn_aggr": r.rchn_aggr,
            "isu_kind_nm": r.isu_kind_nm,
            "join_cnt": r.join_cnt,
            "join_rto": _num(r.join_rto),
        }
        for r in records
    ]
    return rows, total_n, total_n > ROW_LIMIT
