"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginOps } from "../../lib/ops";

/**
 * F-10 운영 로그인. 사용자 `/` Header와 분리한다.
 */
export function OpsLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    setPending(true);
    setError("");
    try {
      await loginOps(username, password);
      router.replace("/ops");
    } catch (caught) {
      setError(caught.message || "운영 접속에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] text-ink">운영 로그인</h1>
      <p className="mt-3 text-base leading-6 text-ink-muted">
        통계 여정과 분리된 운영 화면입니다. 사용자 앱에는 로그인 링크가 없습니다.
      </p>
      <form className="mt-8 max-w-xs space-y-6" method="post" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="username" className="block text-[14px] font-medium text-ink">
            운영 아이디
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            className="mt-2 min-h-12 w-full rounded-[10px] border border-border bg-surface px-3 text-[16px] text-ink"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-[14px] font-medium text-ink">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 min-h-12 w-full rounded-[10px] border border-border bg-surface px-3 text-[16px] text-ink"
          />
        </div>
        {error ? (
          <p className="text-[14px] text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-[12px] bg-brand px-6 text-[16px] font-medium text-on-brand hover:bg-brand-hover disabled:opacity-60"
        >
          접속
        </button>
      </form>
    </section>
  );
}
