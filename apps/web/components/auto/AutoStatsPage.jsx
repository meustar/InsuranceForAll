"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HorizontalBarChart } from "../health/HealthCharts";
import {
  ChartCard,
  ExplanationBlock,
  KpiCard,
  OptionalActions,
  ScopeCrossNav,
  ScopeFilterBar,
  StatusPanel,
} from "../stats/StatsChrome";
import { useSessionProfile } from "../SessionProvider";
import {
  buildAutoViewModel,
  buildDisplayedAutoStats,
  formatAxisCount,
  formatCount,
  formatWon,
} from "../../lib/auto-stats";
import { formatBasePeriod } from "../../lib/health-stats";
import { compactStatsFilters, uniqueFieldValues } from "@/lib/scope-filters";
import { loadExplanation, postScopeStats } from "../../lib/stats-client";

const SOURCE_LABEL = "금융위원회 공공데이터 자동차보험가입정보";

/**
 * 자동차 캐시 통계를 불러와 가입대수와 경과보험료를 분리해 보여 준다.
 */
export function AutoStatsPage() {
  const { profile, ready } = useSessionProfile();
  const birthDate = profile?.birthDate;
  const sex = profile?.sex;
  const areaNm = profile?.areaNm;
  const [isuItmsNm, setIsuItmsNm] = useState("");
  const [mogClsfNm, setMogClsfNm] = useState("");
  const [kncrNm, setKncrNm] = useState("");
  const [catalog, setCatalog] = useState({ isuItmsNm: [], mogClsfNm: [], kncrNm: [] });
  const [state, setState] = useState({ status: "idle", payload: null, message: "" });
  const [report, setReport] = useState({ status: "idle", markdown: "", fallback: false });
  const appliedFilters = useMemo(
    () =>
      compactStatsFilters({
        isuItmsNm,
        mogClsfNm,
        kncrNm,
      }),
    [isuItmsNm, mogClsfNm, kncrNm],
  );

  useEffect(() => {
    if (!ready || !birthDate || !sex || !areaNm) {
      return;
    }
    const controller = new AbortController();
    const loadCatalog = async () => {
      try {
        const payload = await postScopeStats("auto", { birthDate, sex, areaNm }, controller.signal);
        setCatalog({
          isuItmsNm: uniqueFieldValues(payload.rows, "isu_itms_nm"),
          mogClsfNm: uniqueFieldValues(payload.rows, "mog_clsf_nm"),
          kncrNm: uniqueFieldValues(payload.rows, "kncr_nm"),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setCatalog({ isuItmsNm: [], mogClsfNm: [], kncrNm: [] });
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
          "auto",
          { birthDate, sex, areaNm },
          controller.signal,
          appliedFilters,
        );
        setState({ status: "success", payload, message: "" });
        const viewModel = buildAutoViewModel(payload);
        if (viewModel.rows.length === 0) {
          return;
        }
        setReport({ status: "loading", markdown: "", fallback: false });
        try {
          const result = await loadExplanation(
            "auto",
            buildDisplayedAutoStats(payload, viewModel, appliedFilters),
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
            message: error.message || "자동차 통계를 불러오지 못했습니다.",
          });
        }
      }
    };
    load();
    return () => controller.abort();
  }, [ready, birthDate, sex, areaNm, appliedFilters]);

  const viewModel = useMemo(
    () => (state.payload ? buildAutoViewModel(state.payload) : null),
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
      <ScopeCrossNav current="auto" />
      <h1 className="mt-4 text-[28px] font-bold leading-[1.25] text-ink">자동차</h1>
      <p className="mt-3 text-base leading-6 text-ink-muted">
        나와 비슷한 조건의 가입대수와 집계 보험료를 공공 통계로 살펴봅니다. 견적이 아닙니다.
      </p>
      <ScopeFilterBar
        legend="자동차 종목·담보·차종"
        fields={[
          {
            id: "auto-item",
            label: "종목",
            value: isuItmsNm,
            options: catalog.isuItmsNm,
            onChange: setIsuItmsNm,
          },
          {
            id: "auto-coverage",
            label: "담보",
            value: mogClsfNm,
            options: catalog.mogClsfNm,
            onChange: setMogClsfNm,
          },
          {
            id: "auto-car-type",
            label: "차종",
            value: kncrNm,
            options: catalog.kncrNm,
            onChange: setKncrNm,
          },
        ]}
      />

      {state.status === "loading" || state.status === "idle" ? (
        <StatusPanel message="자동차 통계를 불러오는 중입니다." />
      ) : null}
      {state.status === "error" ? <StatusPanel message={state.message} tone="error" /> : null}
      {state.status === "success" && viewModel?.rows.length === 0 ? (
        <StatusPanel message="조건에 맞는 자동차 집계가 없습니다. 다른 시점에 다시 확인해 주세요." />
      ) : null}

      {state.status === "success" && viewModel?.rows.length ? (
        <AutoResults payload={state.payload} viewModel={viewModel} report={report} />
      ) : null}
    </section>
  );
}

/**
 * 가입대수 차트와 경과보험료 차트를 나란히 두지 않고 축을 분리한다.
 */
function AutoResults({ payload, viewModel, report }) {
  const period = formatBasePeriod(viewModel.period || payload.base_period || payload.as_of_date);
  const countCaption = `${SOURCE_LABEL} · 기준년월 ${period} · 단위 대 · 견적 아님`;
  const wonCaption = `${SOURCE_LABEL} · 기준년월 ${period} · 단위 원 · 견적 아님`;

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
      {payload.adapter_note ? (
        <p className="text-[13px] text-ink-muted">{payload.adapter_note}</p>
      ) : null}
      <p className="text-[13px] leading-[1.4] text-ink-muted">
        {payload.disclaimer ||
          "공공 통계를 참고용으로 보여 줍니다. 가입을 권하거나 개인 보험료를 확정하지 않습니다."}
      </p>
      {payload.truncated ? (
        <p className="text-[13px] text-ink-muted">
          캐시 행이 많아 API가 일부만 반환했습니다. 합계는 반환된 최신 연월 행 기준입니다.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="가입대수 합계" value={formatCount(viewModel.totalJoin)} />
        <KpiCard label="경과보험료 합계" value={formatWon(viewModel.totalPremium)} />
        <KpiCard label="대당 평균 경과보험료" value={formatWon(viewModel.perVehicle)} />
      </div>

      <ChartCard title="담보·차종별 가입대수" caption={countCaption}>
        {viewModel.joinSeries.length ? (
          <HorizontalBarChart
            data={viewModel.joinSeries}
            ariaLabel="담보·차종별 가입대수 가로 막대 차트"
            formatValue={formatCount}
            formatTick={formatAxisCount}
          />
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-muted">
            가입대수 값이 없어 가로 막대를 표시하지 않습니다.
          </p>
        )}
      </ChartCard>

      <ChartCard title="담보·차종별 경과보험료" caption={wonCaption}>
        {viewModel.premiumSeries.length ? (
          <HorizontalBarChart
            data={viewModel.premiumSeries}
            ariaLabel="담보·차종별 경과보험료 가로 막대 차트"
            formatValue={formatWon}
          />
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-muted">
            경과보험료 값이 없어 가로 막대를 표시하지 않습니다.
          </p>
        )}
      </ChartCard>

      <ChartCard title="담보·차종별 대당 평균 경과보험료" caption={wonCaption}>
        {viewModel.perVehicleSeries.length ? (
          <HorizontalBarChart
            data={viewModel.perVehicleSeries}
            ariaLabel="담보·차종별 대당 평균 경과보험료 가로 막대 차트"
            formatValue={formatWon}
          />
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-muted">
            대당 평균을 계산할 가입대수가 없어 가로 막대를 표시하지 않습니다.
          </p>
        )}
      </ChartCard>

      <AutoTable rows={viewModel.tableRows} total={viewModel.rows.length} caption={wonCaption} />
      <ExplanationBlock
        report={report}
        pendingLabel="화면의 자동차 집계를 바탕으로 쉬운 설명을 준비하고 있습니다."
      />
      <OptionalActions />
      <ScopeCrossNav current="auto" />
    </div>
  );
}

/**
 * 가입대수와 경과보험료를 표에서도 분리된 열로 제공한다.
 */
function AutoTable({ rows, total, caption }) {
  return (
    <section className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-[18px] font-semibold text-ink">가입대수·경과보험료 표</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
          <caption className="sr-only">종목·담보·차종별 가입대수와 경과보험료</caption>
          <thead>
            <tr className="border-b border-border text-ink-muted">
              <th className="px-3 py-3 font-medium">종목</th>
              <th className="px-3 py-3 font-medium">담보</th>
              <th className="px-3 py-3 font-medium">원산</th>
              <th className="px-3 py-3 font-medium">차종</th>
              <th className="px-3 py-3 text-right font-medium">가입대수</th>
              <th className="px-3 py-3 text-right font-medium">경과보험료</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0">
                <td className="px-3 py-3 text-ink">{row.item}</td>
                <td className="px-3 py-3 text-ink">{row.coverage}</td>
                <td className="px-3 py-3 text-ink-muted">{row.origin}</td>
                <td className="px-3 py-3 text-ink-muted">{row.carType}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink">{formatCount(row.joinCount)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink">
                  {formatWon(row.elapsedPremium)}
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
