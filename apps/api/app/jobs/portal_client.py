"""공공 OpenAPI HTTP 호출. serviceKey는 params로만 넘기고 URL을 직접 조합하지 않는다."""

from typing import Any

import httpx

from app.jobs.sanitize import decoding_service_key, sanitize_text

SUCCESS_CODES = {"00", "0000", "0"}
PAGE_SIZE = 1000
MAX_PAGES = 100

ENDPOINTS = {
    "medical": "https://apis.data.go.kr/1160100/service/GetMedicalReimbursementInsuranceInfoService/getInsuranceInfo",
    "auto": "https://apis.data.go.kr/1160100/service/GetFPAtmbInsujoinInfoService/getContractInfo",
    "life": "https://apis.data.go.kr/1160100/service/GetFPLifeInsuJoinInfoService/getLifeInsuJoinStatus",
}


class PortalError(Exception):
    """포털 결과코드·빈 적재 등 배치가 기대하는 실패. URL·키는 메시지에 넣지 않는다."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


def extract_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """포털 JSON의 item이 객체·배열이어도 같은 리스트로 맞춘다."""
    response = payload.get("response", payload)
    body = response.get("body", {}) if isinstance(response, dict) else {}
    items = body.get("items", {})
    if items in (None, "", []):
        return []
    if isinstance(items, list):
        return [item for item in items if isinstance(item, dict)]
    if isinstance(items, dict):
        item = items.get("item", items)
        if item in (None, ""):
            return []
        if isinstance(item, list):
            return [row for row in item if isinstance(row, dict)]
        if isinstance(item, dict):
            return [item]
    return []


def extract_total_count(payload: dict[str, Any]) -> int | None:
    """페이지네이션 종료 판단용 totalCount. 없으면 한 페이지로 끝낸다."""
    response = payload.get("response", payload)
    body = response.get("body", {}) if isinstance(response, dict) else {}
    raw = body.get("totalCount")
    if raw in (None, ""):
        return None
    return int(raw)


def extract_result(payload: dict[str, Any]) -> tuple[str, str]:
    """header 결과코드와 정제된 메시지만 반환한다. 응답 원문은 남기지 않는다."""
    response = payload.get("response", payload)
    header = response.get("header", {}) if isinstance(response, dict) else {}
    code = str(header.get("resultCode", ""))
    msg = str(header.get("resultMsg", ""))
    return code, sanitize_text(msg)


def fetch_all_items(
    client: httpx.Client,
    *,
    url: str,
    service_key: str,
) -> list[dict[str, Any]]:
    """Decoding 키를 params로 붙여 페이지를 순회한다. 쿼리 문자열은 로그하지 않는다."""
    collected: list[dict[str, Any]] = []
    key = decoding_service_key(service_key)
    for page in range(1, MAX_PAGES + 1):
        response = client.get(
            url,
            params={
                "serviceKey": key,
                "pageNo": page,
                "numOfRows": PAGE_SIZE,
                "resultType": "json",
            },
        )
        response.raise_for_status()
        payload = response.json()
        code, msg = extract_result(payload)
        if code and code not in SUCCESS_CODES:
            raise PortalError(code, msg or "portal_error")
        items = extract_items(payload)
        collected.extend(items)
        total = extract_total_count(payload)
        if not items:
            break
        if total is not None and page * PAGE_SIZE >= total:
            break
        if len(items) < PAGE_SIZE:
            break
    return collected
