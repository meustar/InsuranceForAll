"use client";

import Link from "next/link";
import { HUB_CARDS } from "../lib/copy";
import { useSessionProfile } from "./SessionProvider";

/**
 * 스코프 선택 허브. 차트·AI·강조 배지 없이 동등한 세 카드만 둔다.
 */
export function StatsHub() {
  const { ready, hasSession } = useSessionProfile();

  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] text-ink">통계 허브</h1>
      <p className="mt-3 text-base text-ink-muted">보고 싶은 통계를 선택하세요</p>
      <p className="mt-2 text-[13px] leading-[1.4] text-ink-muted">
        참고용입니다. 세 통계를 같은 비중으로 보여 주며 견적·가입 권유가 아닙니다.
      </p>

      {!ready ? (
        <p className="mt-6 text-[14px] text-ink-muted">세션을 확인하는 중입니다.</p>
      ) : null}

      {ready && !hasSession ? (
        <p className="mt-6 text-[14px] text-ink" role="status">
          프로필이 없어 스코프를 열 수 없습니다.{" "}
          <Link href="/" className="text-brand">
            메인에서 생년월일·성별·지역을 입력
          </Link>
          한 뒤에 이용하세요.
        </p>
      ) : null}

      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {HUB_CARDS.map((card) => (
          <li key={card.href}>
            {hasSession ? (
              <Link
                href={card.href}
                className="flex h-full flex-col rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
              >
                <h2 className="text-[18px] font-semibold text-ink">{card.title}</h2>
                <p className="mt-3 text-[14px] leading-6 text-ink">{card.message}</p>
                <p className="mt-2 text-[13px] leading-[1.4] text-ink-muted">{card.metrics}</p>
              </Link>
            ) : (
              <div className="flex h-full flex-col rounded-[12px] border border-border bg-surface p-5 opacity-45 shadow-[var(--shadow-card)]">
                <h2 className="text-[18px] font-semibold text-ink">{card.title}</h2>
                <p className="mt-3 text-[14px] leading-6 text-ink">{card.message}</p>
                <p className="mt-2 text-[13px] leading-[1.4] text-ink-muted">{card.metrics}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {hasSession ? (
        <p className="mt-8 text-[13px] leading-[1.4] text-ink-muted">
          선택 사항 · 통계 탐색에는 연락처가 필요하지 않습니다.{" "}
          <Link href="/documents" className="inline-flex min-h-11 items-center text-ink-muted hover:text-brand">
            증권 PDF 업로드
          </Link>
          {" · "}
          <Link
            href="/consultations"
            className="inline-flex min-h-11 items-center text-ink-muted hover:text-brand"
          >
            이메일로 상담 신청
          </Link>
        </p>
      ) : null}
    </section>
  );
}
