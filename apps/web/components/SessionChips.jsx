"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { insuranceAgeFromIso } from "../lib/insurance-age";
import { useSessionProfile } from "./SessionProvider";

/**
 * 허브·스코프에서만 보험나이·성별·지역을 보여 준다. 생년월일 원문은 칩에 쓰지 않는다.
 */
export function SessionChips() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, clear } = useSessionProfile();

  if (!pathname.startsWith("/stats") || !profile) {
    return null;
  }

  const age = insuranceAgeFromIso(profile.birthDate);
  const ageLabel = age == null ? "—" : String(age);
  const sex = profile.sex;
  const area = profile.areaNm;

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1040px] flex-wrap items-center gap-2 px-5 py-3 md:px-8">
        <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-muted px-3 text-[13px] text-ink-muted">
          보험나이 {ageLabel}
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-muted px-3 text-[13px] text-ink-muted">
          성별 {sex}
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-muted px-3 text-[13px] text-ink-muted">
          지역 {area}
        </span>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center px-2 text-[14px] text-brand"
        >
          입력 수정
        </Link>
        <button
          type="button"
          onClick={() => {
            clear();
            router.push("/");
          }}
          className="inline-flex min-h-11 items-center px-2 text-[14px] text-danger"
        >
          프로필 초기화
        </button>
      </div>
    </div>
  );
}
