import Link from "next/link";

/**
 * 이메일 상담 골격. 입력란·동의 체크는 A-11에서 붙인다.
 */
export default function ConsultationsPage() {
  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] text-ink">이메일로 상담 신청</h1>
      <p className="mt-3 text-base text-ink-muted">
        통계 확인에는 연락처가 필요하지 않습니다. 상담을 원할 때만 이메일을 받습니다.
      </p>
      <Link href="/stats" className="mt-6 inline-flex min-h-11 items-center text-[14px] text-brand">
        통계로 돌아가기
      </Link>
    </section>
  );
}
