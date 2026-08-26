"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionProfile } from "./SessionProvider";

const TABS = [
  { href: "/stats/health", label: "실손" },
  { href: "/stats/auto", label: "자동차" },
  { href: "/stats/life", label: "생명" },
];

/**
 * 전 화면 공통 상단바. 세션 프로필이 있을 때만 스코프 탭을 연다.
 */
export function AppHeader() {
  const pathname = usePathname();
  const { hasSession } = useSessionProfile();

  return (
    <header className="h-16 shrink-0 border-b border-border bg-surface">
      <div className="mx-auto flex h-full max-w-[1040px] items-center px-5 md:px-8">
        <Link
          href="/"
          className="text-[18px] font-semibold leading-[1.3] text-ink"
        >
          모두의 보험
        </Link>
        <nav className="ml-8 flex gap-6" aria-label="통계 스코프">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            if (!hasSession) {
              return (
                <span
                  key={tab.href}
                  aria-disabled="true"
                  className="cursor-not-allowed text-[15px] font-medium text-ink-muted opacity-45"
                >
                  {tab.label}
                </span>
              );
            }
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-[15px] leading-[1.35] ${
                  active
                    ? "border-b-2 border-brand font-semibold text-brand"
                    : "font-medium text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto" aria-hidden="true" />
      </div>
    </header>
  );
}
