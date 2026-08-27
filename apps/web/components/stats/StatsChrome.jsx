import Link from "next/link";

/**
 * 로딩·오류·빈 데이터 경계를 스코프 화면에서 같은 패턴으로 알린다.
 */
export function StatusPanel({ message, tone = "normal", action = null }) {
  return (
    <div
      className={`mt-6 rounded-[12px] border bg-surface p-5 text-[14px] ${
        tone === "error" ? "border-danger text-danger" : "border-border text-ink-muted"
      }`}
      role={tone === "error" ? "alert" : "status"}
    >
      <p>{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** 핵심 숫자를 차트 밖에서도 읽을 수 있게 제공한다. */
export function KpiCard({ label, value }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <p className="text-[13px] text-ink-muted">{label}</p>
      <p className="mt-2 text-[24px] font-bold text-ink">{value}</p>
    </div>
  );
}

/** D3 SVG와 필수 출처 캡션을 같은 카드에 묶는다. */
export function ChartCard({ title, caption, children }) {
  return (
    <figure className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
      <div className="mt-5 overflow-x-auto">{children}</div>
      <figcaption className="mt-4 text-[13px] leading-[1.4] text-ink-muted">{caption}</figcaption>
    </figure>
  );
}

/**
 * 리포트 API 설명과 공급자 실패 폴백을 동일한 쉬운 설명 블록으로 제공한다.
 */
export function ExplanationBlock({ report, pendingLabel }) {
  let content = pendingLabel;
  if (report.status === "error") {
    content =
      "설명 생성에 실패했습니다. 위 표와 그래프는 공공 통계 참고값이며 가입을 권하거나 개인 보험료를 확정하지 않습니다.";
  } else if (report.status === "success") {
    content = report.markdown;
  }

  return (
    <section className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[18px] font-semibold text-ink">쉬운 설명</h2>
        {report.fallback ? (
          <span className="rounded-full bg-surface-muted px-2 py-1 text-[12px] text-ink-muted">
            기본 설명
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-3 text-[14px] leading-6 text-ink-muted" aria-live="polite">
        {String(content)
          .split(/\n+/)
          .filter(Boolean)
          .map((paragraph) => (
            <p key={paragraph}>{paragraph.replace(/^#+\s*/, "")}</p>
          ))}
      </div>
    </section>
  );
}

/**
 * 통계 탐색과 분리된 PDF·이메일 상담 선택 경로만 제공한다.
 */
export function OptionalActions() {
  const button =
    "inline-flex min-h-11 items-center justify-center rounded-[10px] border border-border bg-surface px-4 text-[14px] font-medium text-ink hover:border-border-strong";
  return (
    <section>
      <p className="text-[13px] text-ink-muted">
        선택 사항 · 통계 탐색에는 연락처가 필요하지 않습니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/documents" className={button}>
          증권 PDF 업로드
        </Link>
        <Link href="/consultations" className={button}>
          이메일로 상담 신청
        </Link>
      </div>
    </section>
  );
}

/** 스코프 화면의 「이전」은 허브로만 보낸다. */
export function BackToHubLink() {
  return (
    <Link href="/stats" className="inline-flex min-h-11 items-center text-[14px] text-brand">
      이전
    </Link>
  );
}
