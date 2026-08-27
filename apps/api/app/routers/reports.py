"""POST/GET /api/v1/reports — 화면 집계만 LLM에 넣고 토큰 HMAC만 저장한다."""

from __future__ import annotations

import hmac
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import AiReport
from app.schemas.reports import ReportCreateRequest, ReportCreateResponse, ReportGetResponse
from app.services.llm_reports import (
    LlmInputError,
    complete_explanation,
    fallback_markdown,
    output_is_banned,
    sanitize_display_payload,
)
from app.session_tokens import (
    bind_session_cookie,
    hmac_session_token,
    issue_session_token,
)

router = APIRouter(prefix="/api/v1", tags=["reports"])

_CACHE_CONTROL = "no-store"
_TOKEN_QUERY_KEYS = frozenset({"access_token", "accessToken", "token"})


def _reject_token_query(request: Request) -> None:
    """리포트 토큰을 URL에 실으면 거절한다. 값은 오류에 넣지 않는다."""
    for key in request.query_params:
        if key in _TOKEN_QUERY_KEYS:
            raise HTTPException(status_code=400, detail="접근 토큰은 Authorization 헤더로만 전달합니다.")


def _bearer_token(request: Request) -> str:
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not header:
        raise HTTPException(status_code=401, detail="리포트 조회에는 Bearer 토큰이 필요합니다.")
    scheme, _, value = header.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        raise HTTPException(status_code=401, detail="리포트 조회에는 Bearer 토큰이 필요합니다.")
    return value.strip()


def _hash_matches(stored: bytes, computed: bytes) -> bool:
    """토큰 HMAC을 상수 시간에 비교한다."""
    if len(stored) != len(computed):
        return False
    return hmac.compare_digest(stored, computed)


@router.post("/reports", response_model=ReportCreateResponse)
async def create_report(
    request: Request,
    response: Response,
    body: ReportCreateRequest,
    session: AsyncSession = Depends(get_db),
) -> ReportCreateResponse:
    """화면 집계로 설명을 만들고 접근 토큰 원문은 한 번만 반환한다."""
    _reject_token_query(request)
    response.headers["Cache-Control"] = _CACHE_CONTROL
    try:
        summary = sanitize_display_payload(body.displayed_stats, body.masked_coverage)
    except LlmInputError:
        raise HTTPException(status_code=400, detail="리포트 입력은 화면 집계만 허용합니다.") from None
    settings = get_settings()
    markdown = await complete_explanation(
        api_key=settings.openai_api_key.get_secret_value(),
        model=settings.openai_model,
        summary=summary,
    )
    is_fallback = markdown is None or output_is_banned(markdown)
    if is_fallback:
        markdown = fallback_markdown(body.scope, summary)
    cookie_token = bind_session_cookie(
        request, response, secure=settings.session_cookie_secure
    )
    access_token = issue_session_token()
    now = datetime.now(timezone.utc)
    report = AiReport(
        id=uuid4(),
        anon_session_key_hash=hmac_session_token(
            settings.session_token_pepper.get_secret_value(), cookie_token
        ),
        document_id=None,
        scope=body.scope,
        access_token_hash=hmac_session_token(
            settings.report_token_pepper.get_secret_value(), access_token
        ),
        input_summary=summary,
        body_markdown=markdown,
        is_fallback=is_fallback,
        created_at=now,
        expires_at=now + timedelta(days=settings.ai_report_retention_days),
    )
    session.add(report)
    await session.commit()
    return ReportCreateResponse(report_id=report.id, access_token=access_token)


@router.get("/reports/{report_id}", response_model=ReportGetResponse)
async def get_report(
    report_id: UUID,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> ReportGetResponse:
    """Bearer 토큰 HMAC이 같고 만료 전인 행만 반환한다."""
    _reject_token_query(request)
    response.headers["Cache-Control"] = _CACHE_CONTROL
    presented = _bearer_token(request)
    report = await session.get(AiReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
    expected = hmac_session_token(
        get_settings().report_token_pepper.get_secret_value(), presented
    )
    if not _hash_matches(report.access_token_hash, expected):
        raise HTTPException(status_code=401, detail="리포트 접근 토큰이 올바르지 않습니다.")
    now = datetime.now(timezone.utc)
    expires = report.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires <= now:
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
    bind_session_cookie(
        request,
        response,
        secure=get_settings().session_cookie_secure,
    )
    return ReportGetResponse(
        report_id=report.id,
        scope=report.scope,  # type: ignore[arg-type]
        body_markdown=report.body_markdown,
        is_fallback=report.is_fallback,
        created_at=report.created_at,
        expires_at=report.expires_at,
        input_summary=report.input_summary,
    )
