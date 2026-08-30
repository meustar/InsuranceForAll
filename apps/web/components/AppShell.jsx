"use client";

import { usePathname } from "next/navigation";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { OpsChrome } from "./ops/OpsChrome";
import { SessionChips } from "./SessionChips";
import { SessionProvider } from "./SessionProvider";

/**
 * 사용자 여정과 `/ops` 운영 표면을 같은 루트에서 갈라 준다.
 */
export function AppShell({ children }) {
  const pathname = usePathname() || "";
  const isOps = pathname === "/ops" || pathname.startsWith("/ops/");

  if (isOps) {
    return (
      <div className="flex min-h-full flex-col bg-surface-page">
        <OpsChrome />
        <main className="mx-auto w-full max-w-[1040px] flex-1 px-5 pt-8 md:px-8">{children}</main>
        <AppFooter />
      </div>
    );
  }

  return (
    <SessionProvider>
      <div className="flex min-h-full flex-col bg-surface-page">
        <AppHeader />
        <SessionChips />
        <main className="mx-auto w-full max-w-[1040px] flex-1 px-5 pt-8 md:px-8">{children}</main>
        <AppFooter />
      </div>
    </SessionProvider>
  );
}
