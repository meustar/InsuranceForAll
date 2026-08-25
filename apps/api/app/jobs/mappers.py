import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from app.models import StatsAutoContract, StatsLifeJoinStatus, StatsMedicalRate


def _get(item: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in item and item[key] not in (None, ""):
            return item[key]
        lower = {str(k).lower(): v for k, v in item.items()}
        if key.lower() in lower and lower[key.lower()] not in (None, ""):
            return lower[key.lower()]
    return None


def _text(item: dict[str, Any], *keys: str) -> str | None:
    value = _get(item, *keys)
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _int(item: dict[str, Any], *keys: str) -> int | None:
    value = _get(item, *keys)
    if value is None or value == "":
        return None
    return int(str(value).replace(",", "").split(".")[0])


def _decimal(item: dict[str, Any], *keys: str) -> Decimal | None:
    value = _get(item, *keys)
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value).replace(",", ""))
    except (InvalidOperation, ValueError):
        return None


def _date(item: dict[str, Any], *keys: str) -> date | None:
    raw = _text(item, *keys)
    if raw is None:
        return None
    compact = raw.replace("-", "")[:8]
    if len(compact) != 8 or not compact.isdigit():
        return None
    return date(int(compact[:4]), int(compact[4:6]), int(compact[6:8]))


def map_medical(item: dict[str, Any], *, sync_run_id) -> StatsMedicalRate | None:
    bas_dt = _date(item, "basDt", "bas_dt")
    age = _int(item, "age")
    if bas_dt is None or age is None:
        return None
    return StatsMedicalRate(
        id=uuid.uuid4(),
        sync_run_id=sync_run_id,
        bas_dt=bas_dt,
        cmpy_cd=_text(item, "cmpyCd", "cmpy_cd"),
        cmpy_nm=_text(item, "cmpyNm", "cmpy_nm"),
        ptrn=_text(item, "ptrn"),
        mog=_text(item, "mog"),
        prd_nm=_text(item, "prdNm", "prd_nm"),
        age=age,
        ml_ins_rt=_decimal(item, "mlInsRt", "ml_ins_rt"),
        fml_ins_rt=_decimal(item, "fmlInsRt", "fml_ins_rt"),
        ofr_inst_nm=_text(item, "ofrInstNm", "ofr_inst_nm"),
        fetched_at=datetime.now(timezone.utc),
    )


def map_auto(item: dict[str, Any], *, sync_run_id) -> StatsAutoContract | None:
    ym = _text(item, "isuCmpyOfrYm", "isu_cmpy_ofr_ym")
    itms = _text(item, "isuItmsNm", "isu_itms_nm")
    sex_nm = _text(item, "sexNm", "sex_nm")
    aggr = _text(item, "aggr")
    if not ym or not itms or not sex_nm or not aggr:
        return None
    return StatsAutoContract(
        id=uuid.uuid4(),
        sync_run_id=sync_run_id,
        isu_cmpy_ofr_ym=ym[:6],
        isu_itms_nm=itms[:32],
        mog_clsf_nm=_text(item, "mogClsfNm", "mog_clsf_nm"),
        sex_nm=sex_nm[:8],
        aggr=aggr[:32],
        atmb_plor_nm=_text(item, "atmbPlorNm", "atmb_plor_nm"),
        kncr_nm=_text(item, "kncrNm", "kncr_nm"),
        join_cnt=_int(item, "joinCnt", "join_cnt"),
        elps_inpm=_decimal(item, "elpsInpm", "elps_inpm"),
        fetched_at=datetime.now(timezone.utc),
    )


def map_life(item: dict[str, Any], *, sync_run_id) -> StatsLifeJoinStatus | None:
    year = _text(item, "sttsAccmlTrgtYr", "stts_accml_trgt_yr")
    area_nm = _text(item, "areaNm", "area_nm")
    sex_nm = _text(item, "sexNm", "sex_nm")
    rchn = _text(item, "rchnAggr", "rchn_aggr")
    kind = _text(item, "isuKindNm", "isu_kind_nm")
    if not year or not area_nm or not sex_nm or not rchn or not kind:
        return None
    return StatsLifeJoinStatus(
        id=uuid.uuid4(),
        sync_run_id=sync_run_id,
        stts_accml_trgt_yr=year[:4],
        area_nm=area_nm[:32],
        sex_nm=sex_nm[:8],
        rchn_aggr=rchn[:32],
        isu_kind_nm=kind[:32],
        join_cnt=_int(item, "joinCnt", "join_cnt"),
        join_rto=_decimal(item, "joinRto", "join_rto"),
        fetched_at=datetime.now(timezone.utc),
    )
