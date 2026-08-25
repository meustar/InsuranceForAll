import re

_URL = re.compile(r"https?://[^\s]+", re.IGNORECASE)
_SERVICE_KEY = re.compile(r"serviceKey=[^&\s]+", re.IGNORECASE)
_QUERY = re.compile(r"\?[^\s]+")


def sanitize_text(value: str, *, limit: int = 240) -> str:
    text = _URL.sub("[redacted-url]", value)
    text = _SERVICE_KEY.sub("serviceKey=[redacted]", text)
    text = _QUERY.sub("", text)
    return text[:limit]
