import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthStatsPage } from "../../../components/health/HealthStatsPage";

const SCOPES = {
  health: "실손",
  auto: "자동차",
  life: "생명",
};

/**
 * 실손만 A-9 화면을 연결하고 자동차·생명 골격은 다음 트랙까지 유지한다.
 */
export default async function StatsScopePage({ params }) {
  const { scope } = await params;
  const title = SCOPES[scope];
  if (!title) {
    notFound();
  }
  if (scope === "health") {
    return <HealthStatsPage />;
  }

  return (
    <section>
      <Link href="/stats" className="inline-flex min-h-11 items-center text-[14px] text-brand">
        이전
      </Link>
      <h1 className="mt-4 text-[28px] font-bold leading-[1.25] text-ink">{title}</h1>
      <p className="mt-3 text-base text-ink-muted">통계·차트는 이후 단계에서 붙입니다.</p>
    </section>
  );
}
