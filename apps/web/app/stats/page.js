import Link from "next/link";

/**
 * 통계 허브 골격. 차트·AI는 두지 않고 스코프 선택 자리만 연다.
 */
export default function StatsHubPage() {
  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] text-ink">통계 허브</h1>
      <p className="mt-3 text-base text-ink-muted">보고 싶은 통계를 선택하세요</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { href: "/stats/health", title: "실손" },
          { href: "/stats/auto", title: "자동차" },
          { href: "/stats/life", title: "생명" },
        ].map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="block rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <h2 className="text-[18px] font-semibold text-ink">{card.title}</h2>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
