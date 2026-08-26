/**
 * 전 화면 공통 하단. 견적·가입 권유가 아님을 고정 문구로 둔다.
 */
export function AppFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-surface-muted px-8 py-6">
      <div className="mx-auto max-w-[1040px]">
        <p className="text-[14px] font-semibold text-ink">모두의 보험</p>
        <p className="mt-1 text-[13px] leading-[1.4] text-ink-muted">
          참고용 · 견적·가입 권유 아님 · 공공데이터 기반 · 실시간 견적 아님
        </p>
      </div>
    </footer>
  );
}
