"""화면 집계만 LLM에 넘기고, 실패·금지 문구면 결정론적 폴백을 쓴다."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

_PROFILE_KEYS = frozenset(
    {
        "birth_date",
        "birthdate",
        "birthDate",
        "date_of_birth",
        "sex",
        "area_nm",
        "areaNm",
        "region",
    }
)
_RAW_DOC_KEYS = frozenset(
    {
        "raw_pdf",
        "pdf_bytes",
        "original_pdf",
        "unmasked",
        "original_filename",
    }
)
_BANNED_OUTPUT = re.compile(
    r"가입하세요|지금 가입|최적 상품|가장 좋은 보험|추천 1위|가입을 권",
    re.IGNORECASE,
)
_MAX_JSON_BYTES = 24_000
_MAX_ROWS = 40
_LLM_TIMEOUT = 12.0
_OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

_SYSTEM = (
    "공공 통계를 쉽게 풀어 쓴 참고 설명만 작성한다. "
    "3~6문장으로 쓴다. 그래프에서 눈에 띄는 점을 짚고, "
    "필요하면 상담 시 물어볼 질문을 한 줄 덧붙인다. "
    "가입을 권하거나 최적 상품·순위를 말하지 않는다. "
    "입력 JSON에 없는 숫자를 만들지 않는다. 생년월일을 묻거나 쓰지 않는다."
)


class LlmInputError(ValueError):
    """화면에 없는 프로필·원문 PDF가 섞이면 요청을 거절한다."""


def _walk_forbidden(value: Any, keys: frozenset[str]) -> bool:
    if isinstance(value, dict):
        for key, child in value.items():
            if key in keys:
                return True
            if _walk_forbidden(child, keys):
                return True
    elif isinstance(value, list):
        return any(_walk_forbidden(item, keys) for item in value)
    return False


def sanitize_display_payload(displayed: dict[str, Any], masked: dict[str, Any] | None) -> dict[str, Any]:
    """LLM·input_summary에 넣을 JSON. 생년월일·원문 PDF 키가 있으면 실패한다."""
    if _walk_forbidden(displayed, _PROFILE_KEYS) or (masked and _walk_forbidden(masked, _PROFILE_KEYS)):
        raise LlmInputError("profile_field")
    if masked and _walk_forbidden(masked, _RAW_DOC_KEYS):
        raise LlmInputError("raw_document")
    if _walk_forbidden(displayed, _RAW_DOC_KEYS):
        raise LlmInputError("raw_document")
    payload: dict[str, Any] = dict(displayed)
    rows = payload.get("rows")
    if isinstance(rows, list) and len(rows) > _MAX_ROWS:
        payload = dict(payload)
        payload["rows"] = rows[:_MAX_ROWS]
        payload["truncated"] = True
    if masked:
        payload = {**payload, "masked_coverage": masked}
    encoded = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
    if len(encoded) > _MAX_JSON_BYTES:
        keep = {
            key: payload[key]
            for key in (
                "scope",
                "stale",
                "stale_message",
                "as_of_date",
                "adapter",
                "row_count",
                "truncated",
                "disclaimer",
                "adapter_note",
                "base_period",
                "source",
                "highlights",
                "series",
            )
            if key in payload
        }
        if "masked_coverage" in payload:
            keep["masked_coverage"] = payload["masked_coverage"]
        payload = keep
    return payload


def fallback_markdown(scope: str, summary: dict[str, Any]) -> str:
    """공급자 실패와 금지 문구일 때 쓰는 고정 문장. 입력에 있는 기준일·건수만 넣는다."""
    period = summary.get("base_period") or summary.get("as_of_date") or "표시된 기준일"
    count = summary.get("row_count")
    count_part = f"표시 건수는 {count}입니다. " if isinstance(count, int) else ""
    adapter = summary.get("adapter")
    adapter_part = ""
    if isinstance(adapter, dict) and adapter:
        adapter_part = "화면에 적용된 연령 보정 값만 참고하세요. "
    return (
        "공공 통계를 쉽게 풀어 쓴 참고 설명입니다. "
        "가입을 권하거나 개인 보험료를 확정하지 않습니다.\n\n"
        f"이 설명은 {scope} 탭에 나온 집계만 다룹니다. 기준은 {period}입니다. "
        f"{count_part}{adapter_part}"
        "표와 그래프에 없는 숫자는 확인하지 마세요. "
        "상담이 필요하면 화면의 이메일 상담을 이용하면 됩니다."
    )


def output_is_banned(text: str) -> bool:
    """모델이 권유·최적·순위 문구를 내면 폴백으로 돌린다."""
    return _BANNED_OUTPUT.search(text) is not None


def _extract_output_text(payload: Any) -> str | None:
    """Responses 출력에서 message의 output_text만 순서대로 합친다."""
    if not isinstance(payload, dict) or not isinstance(payload.get("output"), list):
        return None
    texts: list[str] = []
    for item in payload["output"]:
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if (
                isinstance(part, dict)
                and part.get("type") == "output_text"
                and isinstance(part.get("text"), str)
                and part["text"].strip()
            ):
                texts.append(part["text"].strip())
    return "\n".join(texts) or None


async def complete_explanation(
    *,
    api_key: str,
    model: str,
    summary: dict[str, Any],
) -> str | None:
    """OpenAI Responses HTTP API를 호출하고 공급자 오류·빈 출력이면 None."""
    if not api_key.strip() or api_key == "local-test-placeholder-not-a-secret":
        return None
    body = {
        "model": model,
        "instructions": _SYSTEM,
        "input": json.dumps(summary, ensure_ascii=False, default=str),
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=_LLM_TIMEOUT) as client:
            response = await client.post(_OPENAI_RESPONSES_URL, json=body, headers=headers)
    except httpx.HTTPError:
        return None
    if response.status_code >= 400:
        return None
    try:
        content = _extract_output_text(response.json())
    except (TypeError, ValueError):
        return None
    return content
