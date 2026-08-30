"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HorizontalBarChart } from "../health/HealthCharts";
import {
  BackToHubLink,
  ChartCard,
  ExplanationBlock,
  KpiCard,
  OptionalActions,
  ScopeFilterBar,
  StatusPanel,
} from "../stats/StatsChrome";
import { useSessionProfile } from "../SessionProvider";
import { formatBasePeriod } from "../../lib/health-stats";
import {
  buildDisplayedLifeStats,
  buildLifeViewModel,
  formatAxisCount,
  formatAxisRate,
  formatJoinCount,
  formatJoinRate,
} from "../../lib/life-stats";
import { compactStatsFilters, uniqueFieldValues } from "../../lib/scope-filters";
import { loadExplanation, postScopeStats } from "../../lib/stats-client";

const SOURCE_LABEL = "금융위원회 공공데이터 생명보험가입정보";

/**
 * 생명 캐시 통계를 불러와 가입율과 가입건수(건)를 축을 나눠 보여 준다.
 */
export function LifeStatsPage() {
  const { profile, ready } = useSessionProfile();
  const birthDate = profile?.birthDate;
  const sex = profile?.sex;
  const areaNm = profile?.areaNm;
  const [isuKindNm, setIsuKindNm] = useState("");
  const [sttsAccmlTrgtYr, setSttsAccmlTrgtYr] = useState("");
  const [catalog, setCatalog] = useState({ isuKindNm: [], sttsAccmlTrgtYr: [] });
  const [state, setState] = useState({ status: "idle", payload: null, message: "" });
  const [report, setReport] = useState({ status: "idle", markdown: "", fallback: false });
  const appliedFilters = useMemo(
    () => compactStatsFilters({ isuKindNm, sttsAccmlTrgtYr }),
    [isuKindNm, sttsAccmlTrgtYr],
  );

  useEffect(() => {
    if (!ready || !birthDate || !sex || !areaNm) {
      return;
    }
    const controller = new AbortController();
    const loadCatalog = async () => {
      try {
        const payload = await postScopeStats("life", { birthDate, sex, areaNm }, controller.signal);
        setCatalog({
          isuKindNm: uniqueFieldValues(payload.rows, "isu_kind_nm"),
          sttsAccmlTrgtYr: uniqueFieldValues(payload.rows, "stts_accml_trgt_yr"),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setCatalog({ isuKindNm: [], sttsAccmlTrgtYr: [] });
        }
      }
    };
    loadCatalog();
    return () => controller.abort();
  }, [ready, birthDate, sex, areaNm]);

  useEffect(() => {
    if (!ready || !birthDate || !sex || !areaNm) {
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setState({ status: "loading", payload: null, message: "" });
      setReport({ status: "idle", markdown: "", fallback: false });
      try {
        const payload = await postScopeStats(
          "life",
          { birthDate, sex, areaNm },
          controller.signal,
          appliedFilters,
        );
        setState({ status: "success", payload, message: "" });
        const viewModel = buildLifeViewModel(payload);
        if (viewModel.rows.length === 0) {
          return;
        }
        setReport({ status: "loading", markdown: "", fallback: false });
        try {
          const result = await loadExplanation(
            "life",
            buildDisplayedLifeStats(payload, viewModel, appliedFilters),
            controller.signal,
          );
          setReport({
            status: "success",
            markdown: result.body_markdown,
            fallback: Boolean(result.is_fallback),
          });
        } catch (error) {
          if (error.name !== "AbortError") {
            setReport({ status: "error", markdown: "", fallback: true });
          }
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setState({
            status: "error",
            payload: null,
            message: error.message || "생명 통계를 불러오지 못했습니다.",
          });
        }
      }
    };
    load();
    return () => controller.abort();
  }, [ready, birthDate, sex, areaNm, appliedFilters]);

  const viewModel = useMemo(
    () => (state.payload ? buildLifeViewModel(state.payload) : null),
    [state.payload],
  );

  if (!ready) {
    return <StatusPanel message="세션을 확인하는 중입니다." />;
  }

  if (!profile) {
    return (
      <StatusPanel
        message="프로필 세션이 없습니다."
        action={
          <Link href="/" className="text-brand">
            메인에서 입력하기
          </Link>
        }
      />
    );
  }

  return (
    <section>
      <BackToHubLink />
      <h1 className="mt-4 text-[28px] font-bold leading-[1.25] text-ink">생명</h1>
      <p className="mt-3 text-base leading-6 text-ink-muted">
        같은 연령·성별·지역의 보험종류별 가입건수와 가입율을 공공 통계로 살펴봅니다. 가입건수는 건
        단위이며 사람 수가 아닙니다.
      </p>
      <ScopeFilterBar
        legend="생명 종류·연도"
        fields={[
          {
            id: "life-kind",
            label: "보험종류",
            value: isuKindNm,
            options: catalog.isuKindNm,
            onChange: setIsuKindNm,
          },
          {
            id: "life-year",
            label: "기준연도",
            value: sttsAccmlTrgtYr,
            options: catalog.sttsAccmlTrgtYr,
            onChange: setSttsAccmlTrgtYr,
          },
        ]}
      />

      {state.status === "loading" || state.status === "idle" ? (
        <StatusPanel message="생명 통계를 불러오는 중입니다." />
      ) : null}
      {state.status === "error" ? <StatusPanel message={state.message} tone="error" /> : null}
      {state.status === "success" && viewModel?.rows.length === 0 ? (
        <StatusPanel message="조건에 맞는 생명 가입현황이 없습니다. 다른 시점에 다시 확인해 주세요." />
      ) : null}

      {state.status === "success" && viewModel?.rows.length ? (
        <LifeResults payload={state.payload} viewModel={viewModel} report={report} />
      ) : null}
    </section>
  );
}

/**
 * 가입율 막대와 가입건수 막대를 분리해 이중축·인원 오인을 막는다.
 */
function LifeResults({ payload, viewModel, report }) {
  const period = formatBasePeriod(viewModel.year || payload.base_period || payload.as_of_date);
  const rateCaption = `${SOURCE_LABEL} · 기준년월 ${period} · 단위 % · 견적 아님`;
  const countCaption = `${SOURCE_LABEL} · 기준년월 ${period} · 단위 건 · 견적 아님`;

  return (
    <div className="mt-8 space-y-8">
      {payload.stale ? (
        <div
          className="rounded-[12px] border border-border-strong bg-surface-muted p-4 text-[14px] text-ink"
          role="status"
        >
          {payload.stale_message || "이전 동기화 캐시를 보여 줍니다. 최신 수치가 아닐 수 있습니다."}
        </div>
      ) : null}
      <p className="text-[13px] leading-[1.4] text-ink-muted">
        {payload.disclaimer ||
          "공공 통계를 참고용으로 보여 줍니다. 가입을 권하거나 개인 보험료를 확정하지 않습니다."}
      </p>
      {payload.truncated ? (
        <p className="text-[13px] text-ink-muted">
          캐시 행이 많아 API가 일부만 반환했습니다. 숫자는 반환된 최신 연도 행 기준입니다.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="가입건수 합계" value={formatJoinCount(viewModel.totalJoin)} />
        <KpiCard label="조회 행 수" value={String(viewModel.rows.length)} />
      </div>
      <p className="text-[13px] text-ink-muted">
        가입건수는 건 단위 집계이며 사람 수로 읽지 않습니다.
      </p>

      <ChartCard title="보험종류별 가입율" caption={rateCaption}>
        {viewModel.rateSeries.length ? (
          <HorizontalBarChart
            data={viewModel.rateSeries}
            ariaLabel="보험종류별 가입율 가로 막대 차트"
            formatValue={formatJoinRate}
            formatTick={formatAxisRate}
          />
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-muted">
            가입율 값이 없어 가로 막대를 표시하지 않습니다.
          </p>
        )}
      </ChartCard>

      <ChartCard title="보험종류별 가입건수" caption={countCaption}>
        {viewModel.countSeries.length ? (
          <HorizontalBarChart
            data={viewModel.countSeries}
            ariaLabel="보험종류별 가입건수 가로 막대 차트"
            formatValue={formatJoinCount}
            formatTick={formatAxisCount}
          />
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-muted">
            가입건수 값이 없어 가로 막대를 표시하지 않습니다.
          </p>
        )}
      </ChartCard>

      <LifeTable rows={viewModel.tableRows} total={viewModel.rows.length} caption={countCaption} />
      <ExplanationBlock
        report={report}
        pendingLabel="화면의 생명 집계를 바탕으로 쉬운 설명을 준비하고 있습니다."
      />
      <OptionalActions />
      <BackToHubLink />
    </div>
  );
}

/**
 * 가입건수(건)와 가입율을 한 표에 두되 단위를 열 이름으로 고정한다.
 */
function LifeTable({ rows, total, caption }) {
  return (
    <section className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-[18px] font-semibold text-ink">보험종류별 가입건수·가입율 표</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
          <caption className="sr-only">보험종류별 가입건수(건)와 가입율</caption>
          <thead>
            <tr className="border-b border-border text-ink-muted">
              <th className="px-3 py-3 font-medium">보험종류</th>
              <th className="px-3 py-3 font-medium">기준연도</th>
              <th className="px-3 py-3 text-right font-medium">가입건수(건)</th>
              <th className="px-3 py-3 text-right font-medium">가입율(%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0">
                <td className="px-3 py-3 text-ink">{row.kind}</td>
                <td className="px-3 py-3 text-ink-muted">{row.year}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink">
                  {formatJoinCount(row.joinCount)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-ink">
                  {formatJoinRate(row.joinRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > rows.length ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          화면 가독성을 위해 반환된 {total.toLocaleString("ko-KR")}행 중 앞 {rows.length}행을 표에 표시합니다.
        </p>
      ) : null}
      <p className="mt-3 text-[13px] leading-[1.4] text-ink-muted">{caption}</p>
    </section>
  );
}
