"use client";

import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { SessionChips } from "./SessionChips";

/**
 * Header·칩·Footer를 모든 라우트에 같은 기하로 붙인다.
 */
export function AppShell({ children }) {
  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <AppHeader />
      <SessionChips />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-5 pt-8 md:px-8">{children}</main>
      <AppFooter />
    </div>
  );
}
