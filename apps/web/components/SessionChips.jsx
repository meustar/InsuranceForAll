"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 허브·스코프에서만 보이는 세션 요약 칩 자리. 값은 A-8에서 채우고 지금은 비운다.
 */
export function SessionChips() {
  const pathname = usePathname();
  if (!pathname.startsWith("/stats")) {
    return null;
  }

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1040px] flex-wrap items-center gap-2 px-5 py-3 md:px-8">
        {["보험나이", "성별", "지역"].map((label) => (
          <span
            key={label}
            className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-muted px-3 text-[13px] text-ink-muted"
          >
            {label} —
          </span>
        ))}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center px-2 text-[14px] text-brand"
        >
          입력 수정
        </Link>
      </div>
    </div>
  );
}
