import { HealthStatsPage } from "../../../components/health/HealthStatsPage";
import { AutoStatsPage } from "../../../components/auto/AutoStatsPage";
import { LifeStatsPage } from "../../../components/life/LifeStatsPage";
import { notFound } from "next/navigation";

const SCOPES = {
  health: "실손",
  auto: "자동차",
  life: "생명",
};

/**
 * 스코프 탭을 연결한다. 「이전」은 각 화면에서 허브로만 보낸다.
 */
export default async function StatsScopePage({ params }) {
  const { scope } = await params;
  if (!SCOPES[scope]) {
    notFound();
  }
  if (scope === "health") {
    return <HealthStatsPage />;
  }
  if (scope === "auto") {
    return <AutoStatsPage />;
  }
  return <LifeStatsPage />;
}
