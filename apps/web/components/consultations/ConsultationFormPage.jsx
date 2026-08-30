"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  CONSULT_RATIONALE,
  FALLBACK_NOTICE,
  SUCCESS_MESSAGE,
  validateConsultForm,
} from "../../lib/consultations";
import { readApiError } from "../../lib/stats-client";

/**
 * 같은 라우트에서 동의 모달을 연 뒤에만 이메일을 받는다. 전화번호 입력은 두지 않는다.
 */
export function ConsultationFormPage() {
  const titleId = useId();
  const [notice, setNotice] = useState(FALLBACK_NOTICE);
  const [noticeReady, setNoticeReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
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

      {success ? (
        <p className="mt-8 rounded-[12px] border border-border bg-surface p-5 text-[16px] text-ink" role="status">
          {SUCCESS_MESSAGE}
        </p>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-border bg-surface px-4 text-[14px] font-medium text-ink hover:border-border-strong"
            onClick={() => setModalOpen(true)}
            disabled={!noticeReady}
          >
            개인정보 처리 고지 보기
          </button>
          {agreed ? (
            <p className="text-[14px] text-ink-muted">고지를 확인했고 상담 연락을 위해 이메일 처리에 동의했습니다.</p>
          ) : (
            <p className="text-[14px] text-ink-muted">고지 모달에서 동의한 뒤에만 신청할 수 있습니다.</p>
          )}

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

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.4)] p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <h2 id={titleId} className="text-[16px] font-semibold text-ink">
              상담 개인정보 처리 고지
            </h2>
            <dl className="mt-4 space-y-3 text-[14px] leading-6 text-ink-muted">
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
            <label className="mt-6 flex min-h-11 items-start gap-2 text-[14px] leading-6 text-ink">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1"
              />
              위 고지를 확인했고 상담 연락을 위해 이메일 처리에 동의합니다.
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-[12px] bg-brand px-6 text-[16px] font-medium text-on-brand hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-45"
                disabled={!agreed}
                onClick={() => setModalOpen(false)}
              >
                동의하고 닫기
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center text-[14px] text-brand"
                onClick={() => {
                  setAgreed(false);
                  setModalOpen(false);
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Link href="/stats" className="mt-8 inline-flex min-h-11 items-center text-[14px] text-brand">
        통계로 돌아가기
      </Link>
    </section>
  );
}
