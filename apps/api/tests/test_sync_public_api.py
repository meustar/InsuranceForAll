import io
import logging
from unittest.mock import MagicMock
from uuid import uuid4

import httpx
from pydantic import SecretStr

from app.jobs.mappers import map_auto, map_life, map_medical
from app.jobs.portal_client import extract_items, fetch_all_items
from app.jobs.sanitize import decoding_service_key, sanitize_text
from app.jobs.sync_public_api import PublicSyncSettings, configure_sync_logging, sync_source
from app.models import PublicSyncRun, StatsMedicalRate


def test_sanitize_redacts_key_and_url() -> None:
    raw = "failed https://apis.data.go.kr/x?serviceKey=abc123&pageNo=1 extra"
    cleaned = sanitize_text(raw).lower()
    assert "abc123" not in cleaned
    assert "https://" not in cleaned
    assert "servicekey=secret" not in sanitize_text("boom serviceKey=secret leftover").lower()


def test_decoding_key_without_percent_is_unchanged() -> None:
    assert decoding_service_key("placeholder-plus+slash/") == "placeholder-plus+slash/"


def test_extract_items_single_and_list() -> None:
    single = {"response": {"body": {"items": {"item": {"age": "1"}}}}}
    listed = {"response": {"body": {"items": {"item": [{"age": "1"}, {"age": "2"}]}}}}
    assert len(extract_items(single)) == 1
    assert len(extract_items(listed)) == 2


def test_map_medical_auto_life() -> None:
    run_id = uuid4()
    medical = map_medical({"basDt": "20260115", "age": "40", "mlInsRt": "10.5"}, sync_run_id=run_id)
    auto = map_auto(
        {
            "isuCmpyOfrYm": "202601",
            "isuItmsNm": "개인용",
            "sexNm": "남자",
            "aggr": "40대",
            "joinCnt": "3",
        },
        sync_run_id=run_id,
    )
    life = map_life(
        {
            "sttsAccmlTrgtYr": "2024",
            "areaNm": "서울",
            "sexNm": "여자",
            "rchnAggr": "40대",
            "isuKindNm": "종신",
            "joinRto": "1.2",
        },
        sync_run_id=run_id,
    )
    assert medical is not None and medical.age == 40
    assert auto is not None and auto.aggr == "40대"
    assert life is not None and life.area_nm == "서울"


def test_fetch_pages_uses_params_not_raw_url() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert b"serviceKey" in request.url.query
        return httpx.Response(
            200,
            json={
                "response": {
                    "header": {"resultCode": "00", "resultMsg": "NORMAL SERVICE."},
                    "body": {
                        "totalCount": 1,
                        "numOfRows": 1000,
                        "pageNo": 1,
                        "items": {"item": {"basDt": "20260101", "age": "30"}},
                    },
                }
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    items = fetch_all_items(client, url="https://example.test/getInsuranceInfo", service_key="placeholder")
    client.close()
    assert items[0]["age"] == "30"


def _settings_without_keys() -> PublicSyncSettings:
    return PublicSyncSettings(
        database_url=SecretStr("postgresql+asyncpg://app:x@localhost/db"),
        data_go_kr_medical_api_key=SecretStr(""),
        data_go_kr_auto_api_key=SecretStr(""),
        data_go_kr_life_api_key=SecretStr(""),
    )


def test_missing_key_marks_failed_and_stale() -> None:
    session = MagicMock()
    head = MagicMock()
    session.get.return_value = head
    status = sync_source(session, "medical", seed=False, settings=_settings_without_keys())
    assert status == "failed"
    added = session.add.call_args[0][0]
    assert isinstance(added, PublicSyncRun)
    assert added.status == "failed"
    assert added.error_code == "missing_key"
    assert head.stale is True
    session.commit.assert_called()


def test_seed_persists_success_and_head() -> None:
    session = MagicMock()
    session.get.return_value = None
    status = sync_source(session, "medical", seed=True, settings=_settings_without_keys())
    assert status == "success"
    added_types = {type(call.args[0]).__name__ for call in session.add.call_args_list}
    assert "PublicSyncRun" in added_types
    assert "PublicCacheHead" in added_types
    seeded = session.add_all.call_args[0][0]
    assert isinstance(seeded[0], StatsMedicalRate)
    session.commit.assert_called()


def test_sync_logging_omits_portal_url_and_service_key() -> None:
    configure_sync_logging()
    buffer = io.StringIO()
    handler = logging.StreamHandler(buffer)
    handler.setLevel(logging.INFO)
    root = logging.getLogger()
    root.addHandler(handler)
    try:
        logging.getLogger("httpx").info(
            "HTTP Request: GET https://apis.data.go.kr/x?serviceKey=placeholder-not-a-secret"
        )
        logging.getLogger("httpcore").info("connect_tcp.started")
        logging.getLogger("sync_public_api").info("sync source=medical status=success rows=1")
        output = buffer.getvalue().lower()
    finally:
        root.removeHandler(handler)
    assert "servicekey" not in output
    assert "apis.data.go.kr" not in output
    assert "https://" not in output
    assert "sync source=medical" in output


def test_decoding_key_is_unquoted_once_before_params() -> None:
    captured: list[bytes] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request.url.query)
        return httpx.Response(
            200,
            json={
                "response": {
                    "header": {"resultCode": "00", "resultMsg": "NORMAL SERVICE."},
                    "body": {"totalCount": 0, "items": {}},
                }
            },
        )

    encoded_placeholder = "placeholder%2Bnot-a-secret%3D"
    client = httpx.Client(transport=httpx.MockTransport(handler))
    fetch_all_items(client, url="https://example.test/getInsuranceInfo", service_key=encoded_placeholder)
    client.close()
    query = captured[0].decode()
    assert "%252B" not in query
    assert "serviceKey=" in query


def test_dry_run_seed_does_not_write() -> None:
    session = MagicMock()
    status = sync_source(
        session,
        "medical",
        seed=True,
        settings=_settings_without_keys(),
        dry_run=True,
    )
    assert status == "dry-run"
    session.commit.assert_not_called()
    session.add.assert_not_called()
