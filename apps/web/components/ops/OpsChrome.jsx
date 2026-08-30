"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logoutOps } from "../../lib/ops";

/**
 * 운영 전용 상단. 사용자 통계 탭·Sign In·프로필 칩을 두지 않는다.
 */
export function OpsChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const onLogin = pathname === "/ops/login";

  async function onLogout() {
    setError("");
    try {
      await logoutOps();
      router.replace("/ops/login");
    } catch (caught) {
      setError(caught.message || "로그아웃에 실패했습니다.");
    }
  }

  return (
    <header className="h-16 shrink-0 border-b border-border bg-surface">
      <div className="mx-auto flex h-full max-w-[1040px] items-center px-5 md:px-8">
        <Link href="/ops" className="text-[18px] font-semibold leading-[1.3] text-ink">
          모두의 보험 운영
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {onLogin ? null : (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-11 items-center justify-center rounded-[10px] px-4 text-[15px] font-medium text-ink-muted hover:text-ink"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p className="mx-auto max-w-[1040px] px-5 pb-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </header>
  );
}
