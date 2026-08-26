"""공공데이터포털 응답에서 키·URL을 지운 짧은 오류 문구를 만든다."""

import re
from urllib.parse import unquote

_URL = re.compile(r"https?://[^\s]+", re.IGNORECASE)
_SERVICE_KEY = re.compile(r"serviceKey=[^&\s]+", re.IGNORECASE)
_QUERY = re.compile(r"\?[^\s]+")


def sanitize_text(value: str, *, limit: int = 240) -> str:
    """로그·error_message에 쓸 문자열에서 URL과 serviceKey를 제거한다."""
    text = _URL.sub("[redacted-url]", value)
    text = _SERVICE_KEY.sub("serviceKey=[redacted]", text)
    text = _QUERY.sub("", text)
    return text[:limit]


def decoding_service_key(raw: str) -> str:
    """Encoding 키(%2B 등)면 한 번만 풀어 params=가 이중 인코딩하지 않게 한다."""
    stripped = raw.strip()
    if "%" not in stripped:
        return stripped
    return unquote(stripped)
