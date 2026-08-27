"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONSULT_RATIONALE,
  FALLBACK_NOTICE,
  SUCCESS_MESSAGE,
  validateConsultForm,
} from "../../lib/consultations";
import { readApiError } from "../../lib/stats-client";

/**
 * 동의 고지 후 이메일만 받아 상담을 접수한다. 전화번호 입력은 두지 않는다.
 */
export function ConsultationFormPage() {
  const [notice, setNotice] = useState(FALLBACK_NOTICE);
  const [noticeReady, setNoticeReady] = useState(false);
  const [email, setEmail] = useState("");
  const [memo, setMemo] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/v1/consultations/notice", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("notice");
        }
        const body = await response.json();
        setNotice({
          version: body.version || "",
          purpose: body.purpose || FALLBACK_NOTICE.purpose,
          items: body.items || FALLBACK_NOTICE.items,
          retention: body.retention || FALLBACK_NOTICE.retention,
          refusal: body.refusal || FALLBACK_NOTICE.refusal,
          contact_channel: "email",
        });
        setNoticeReady(true);
      } catch (caught) {
        if (caught.name !== "AbortError") {
          setNoticeReady(false);
        }
      }
    };
    load();
    return () => controller.abort();
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    const checked = validateConsultForm({
      email,
      consentAgreed: agreed,
      noticeVersion: notice.version,
    });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setError("");
    try {
      const response = await fetch("/api/v1/consultations", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent_agreed: true,
          consent_notice_version: notice.version,
          contact_channel: "email",
          email: checked.email,
          purpose_note: memo.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "상담을 접수하지 못했습니다."));
      }
      setSuccess(true);
      setEmail("");
      setMemo("");
      setAgreed(false);
    } catch (caught) {
      setError(caught.message || "상담을 접수하지 못했습니다.");
    }
  }

  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] text-ink">이메일로 상담 신청</h1>
      <p className="mt-3 text-base leading-6 text-ink-muted">{CONSULT_RATIONALE}</p>

      <aside
        className="mt-8 rounded-[12px] border border-border bg-surface p-5 text-[14px] leading-6 text-ink-muted"
        aria-labelledby="consult-consent-title"
      >
        <h2 id="consult-consent-title" className="text-[16px] font-semibold text-ink">
          상담 개인정보 처리 고지
        </h2>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="font-medium text-ink">목적</dt>
            <dd className="mt-1">{notice.purpose}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">항목</dt>
            <dd className="mt-1">{notice.items}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">보유기간</dt>
            <dd className="mt-1">{notice.retention}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">거부권</dt>
            <dd className="mt-1">{notice.refusal}</dd>
          </div>
        </dl>
      </aside>

      {success ? (
        <p className="mt-8 rounded-[12px] border border-border bg-surface p-5 text-[16px] text-ink" role="status">
          {SUCCESS_MESSAGE}
        </p>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="consult-email" className="block text-[14px] font-medium text-ink">
              이메일
            </label>
            <input
              id="consult-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-12 w-full max-w-md rounded-[10px] border border-border bg-surface px-3 text-[16px] text-ink"
            />
          </div>
          <div>
            <label htmlFor="consult-memo" className="block text-[14px] font-medium text-ink">
              메모 (선택)
            </label>
            <textarea
              id="consult-memo"
              name="purpose_note"
              rows={4}
              maxLength={2000}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="mt-2 w-full max-w-md rounded-[10px] border border-border bg-surface px-3 py-2 text-[16px] text-ink"
            />
          </div>
          <label className="flex min-h-11 items-start gap-2 text-[14px] leading-6 text-ink">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1"
            />
            위 고지를 확인했고 상담 연락을 위해 이메일 처리에 동의합니다.
          </label>
          {error ? (
            <p className="text-[14px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-12 min-w-[180px] items-center justify-center rounded-[12px] bg-brand px-6 text-[16px] font-medium text-on-brand hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-45"
            disabled={!noticeReady || !agreed}
          >
            상담 신청하기
          </button>
        </form>
      )}

      <Link href="/stats" className="mt-8 inline-flex min-h-11 items-center text-[14px] text-brand">
        통계로 돌아가기
      </Link>
    </section>
  );
}
