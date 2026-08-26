import Link from "next/link";

/**
 * 증권 PDF 업로드 골격. 파일 입력은 A-11에서 붙인다.
 */
export default function DocumentsPage() {
  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] text-ink">증권 PDF 업로드</h1>
      <p className="mt-3 text-base text-ink-muted">
        선택 경로입니다. 원본은 보관하지 않고 마스킹 결과만 남깁니다.
      </p>
      <Link href="/stats" className="mt-6 inline-flex min-h-11 items-center text-[14px] text-brand">
        통계로 돌아가기
      </Link>
    </section>
  );
}
