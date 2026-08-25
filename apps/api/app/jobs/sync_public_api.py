"""F-11 public OpenAPI batch sync. CLI: python -m app.jobs.sync_public_api"""

from __future__ import annotations

import argparse
import logging
import sys
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from functools import lru_cache

import httpx
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db import sync_database_url
from app.jobs.mappers import map_auto, map_life, map_medical
from app.jobs.portal_client import ENDPOINTS, PortalError, fetch_all_items
from app.jobs.sanitize import sanitize_text
from app.models import PublicCacheHead, PublicSyncRun, StatsAutoContract, StatsLifeJoinStatus, StatsMedicalRate

logger = logging.getLogger("sync_public_api")
_HTTP_LOGGERS = ("httpx", "httpcore", "httpx._client", "httpcore.http11", "httpcore.connection")

SOURCES = ("medical", "auto", "life")
MAPPERS = {
    "medical": map_medical,
    "auto": map_auto,
    "life": map_life,
}


class PublicSyncSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", env_file=None, case_sensitive=False)

    database_url: SecretStr
    data_go_kr_medical_api_key: SecretStr = Field(default=SecretStr(""))
    data_go_kr_auto_api_key: SecretStr = Field(default=SecretStr(""))
    data_go_kr_life_api_key: SecretStr = Field(default=SecretStr(""))


@lru_cache
def get_sync_settings() -> PublicSyncSettings:
    return PublicSyncSettings()


def configure_sync_logging() -> None:
    """배치 로거만 INFO로 두고 httpx가 요청 URL을 출력하지 않게 한다."""
    root = logging.getLogger()
    root.setLevel(logging.WARNING)
    if not any(isinstance(handler, logging.StreamHandler) for handler in root.handlers):
        handler = logging.StreamHandler()
        handler.setLevel(logging.INFO)
        handler.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
        root.addHandler(handler)
    logger.setLevel(logging.INFO)
    for name in _HTTP_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)


def _key_for(settings: PublicSyncSettings, source: str) -> str:
    mapping = {
        "medical": settings.data_go_kr_medical_api_key,
        "auto": settings.data_go_kr_auto_api_key,
        "life": settings.data_go_kr_life_api_key,
    }
    return mapping[source].get_secret_value().strip()


def _base_period(source: str, rows: list) -> str:
    if not rows:
        return datetime.now(timezone.utc).strftime("%Y%m%d")[:16]
    if source == "medical":
        return max(row.bas_dt for row in rows).strftime("%Y%m%d")
    if source == "auto":
        return max(row.isu_cmpy_ofr_ym for row in rows)[:16]
    return max(row.stts_accml_trgt_yr for row in rows)[:16]


def seed_rows(source: str, sync_run_id: uuid.UUID) -> list:
    now = datetime.now(timezone.utc)
    if source == "medical":
        return [
            StatsMedicalRate(
                id=uuid.uuid4(),
                sync_run_id=sync_run_id,
                bas_dt=date(2026, 1, 1),
                cmpy_cd="SEED",
                cmpy_nm="합성보험-실손",
                ptrn="급여",
                mog="입원",
                prd_nm="SEED-MEDICAL-NOT-REAL",
                age=40,
                ml_ins_rt=Decimal("10000.00"),
                fml_ins_rt=Decimal("12000.00"),
                ofr_inst_nm="SEED",
                fetched_at=now,
            )
        ]
    if source == "auto":
        return [
            StatsAutoContract(
                id=uuid.uuid4(),
                sync_run_id=sync_run_id,
                isu_cmpy_ofr_ym="202601",
                isu_itms_nm="개인용",
                mog_clsf_nm="대인배상1",
                sex_nm="남자",
                aggr="40대",
                atmb_plor_nm="국산",
                kncr_nm="중형",
                join_cnt=10,
                elps_inpm=Decimal("1000000"),
                fetched_at=now,
            )
        ]
    return [
        StatsLifeJoinStatus(
            id=uuid.uuid4(),
            sync_run_id=sync_run_id,
            stts_accml_trgt_yr="2024",
            area_nm="서울",
            sex_nm="여자",
            rchn_aggr="40대",
            isu_kind_nm="종신",
            join_cnt=7,
            join_rto=Decimal("12.34"),
            fetched_at=now,
        )
    ]


def _persist_success(session: Session, source: str, rows: list) -> int:
    run_id = rows[0].sync_run_id
    run = PublicSyncRun(
        id=run_id,
        source=source,
        base_period=_base_period(source, rows),
        status="success",
        row_count=len(rows),
        started_at=datetime.now(timezone.utc),
        finished_at=datetime.now(timezone.utc),
    )
    session.add(run)
    session.add_all(rows)
    session.flush()
    head = session.get(PublicCacheHead, source)
    now = datetime.now(timezone.utc)
    if head is None:
        session.add(
            PublicCacheHead(
                source=source,
                active_sync_run_id=run.id,
                stale=False,
                updated_at=now,
            )
        )
    else:
        head.active_sync_run_id = run.id
        head.stale = False
        head.updated_at = now
    session.commit()
    return len(rows)


def _persist_failure(session: Session, source: str, error_code: str, message: str) -> None:
    session.add(
        PublicSyncRun(
            id=uuid.uuid4(),
            source=source,
            base_period=datetime.now(timezone.utc).strftime("%Y%m%d"),
            status="failed",
            row_count=0,
            started_at=datetime.now(timezone.utc),
            finished_at=datetime.now(timezone.utc),
            error_code=error_code[:64],
            error_message_sanitized=sanitize_text(message),
        )
    )
    head = session.get(PublicCacheHead, source)
    if head is not None:
        head.stale = True
        head.updated_at = datetime.now(timezone.utc)
    session.commit()


def sync_source(
    session: Session,
    source: str,
    *,
    seed: bool,
    settings: PublicSyncSettings,
    client: httpx.Client | None = None,
) -> str:
    run_id = uuid.uuid4()
    try:
        if seed:
            rows = seed_rows(source, run_id)
        else:
            key = _key_for(settings, source)
            if not key:
                raise PortalError("missing_key", "api key not configured")
            http_client = client or httpx.Client(timeout=30.0, event_hooks={})
            own_client = client is None
            try:
                items = fetch_all_items(http_client, url=ENDPOINTS[source], service_key=key)
            finally:
                if own_client:
                    http_client.close()
            mapper = MAPPERS[source]
            rows = [row for item in items if (row := mapper(item, sync_run_id=run_id)) is not None]
            if not rows:
                raise PortalError("empty_payload", "no mappable rows")
        count = _persist_success(session, source, rows)
        logger.info("sync source=%s status=success rows=%s", source, count)
        return "success"
    except PortalError as exc:
        _persist_failure(session, source, exc.code, str(exc))
        logger.warning("sync source=%s status=failed code=%s", source, exc.code)
        return "failed"
    except Exception as exc:
        _persist_failure(session, source, "sync_error", sanitize_text(str(exc)))
        logger.warning("sync source=%s status=failed code=sync_error", source)
        return "failed"


def run_all(*, seed: bool = False, sources: tuple[str, ...] = SOURCES) -> dict[str, str]:
    configure_sync_logging()
    settings = get_sync_settings()
    engine = create_engine(sync_database_url(settings.database_url.get_secret_value()))
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    results: dict[str, str] = {}
    with factory() as session:
        for source in sources:
            results[source] = sync_source(session, source, seed=seed, settings=settings)
    engine.dispose()
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="F-11 public OpenAPI cache sync")
    parser.add_argument("--seed", action="store_true", help="Insert synthetic cache rows (no portal call)")
    parser.add_argument(
        "--source",
        choices=[*SOURCES, "all"],
        default="all",
    )
    args = parser.parse_args(argv)
    configure_sync_logging()
    sources = SOURCES if args.source == "all" else (args.source,)
    results = run_all(seed=args.seed, sources=sources)
    logger.info("sync finished %s", results)
    return 0 if all(status == "success" for status in results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
