from typing import Any

import httpx

from app.jobs.sanitize import sanitize_text

SUCCESS_CODES = {"00", "0000", "0"}
PAGE_SIZE = 1000
MAX_PAGES = 100

ENDPOINTS = {
    "medical": "https://apis.data.go.kr/1160100/service/GetMedicalReimbursementInsuranceInfoService/getInsuranceInfo",
    "auto": "https://apis.data.go.kr/1160100/service/GetFPAtmbInsujoinInfoService/getContractInfo",
    "life": "https://apis.data.go.kr/1160100/service/GetFPLifeInsuJoinInfoService/getLifeInsuJoinStatus",
}


class PortalError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


def extract_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
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
    response = payload.get("response", payload)
    body = response.get("body", {}) if isinstance(response, dict) else {}
    raw = body.get("totalCount")
    if raw in (None, ""):
        return None
    return int(raw)


def extract_result(payload: dict[str, Any]) -> tuple[str, str]:
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
    collected: list[dict[str, Any]] = []
    for page in range(1, MAX_PAGES + 1):
        response = client.get(
            url,
            params={
                "serviceKey": service_key,
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
