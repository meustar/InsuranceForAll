"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildDisplayedHealthStats,
  buildHealthViewModel,
  formatBasePeriod,
  formatWon,
} from "../../lib/health-stats";
import { compactStatsFilters, uniqueFieldValues } from "../../lib/scope-filters";
import { loadExplanation, postScopeStats } from "../../lib/stats-client";
import { useSessionProfile } from "../SessionProvider";
import { ScopeFilterBar } from "../stats/StatsChrome";
import { BoxSummaryChart, DumbbellChart, HorizontalBarChart } from "./HealthCharts";

const SOURCE_LABEL = "금융위원회 공공데이터 실손보험정보";

/**
 * 실손 캐시 통계를 불러와 KPI·표·D3 차트와 하단 설명을 한 화면에 제공한다.
 */
export function HealthStatsPage() {
  const { profile, ready } = useSessionProfile();
  const birthDate = profile?.birthDate;
  const sex = profile?.sex;
  const areaNm = profile?.areaNm;
  const [ptrn, setPtrn] = useState("");
  const [mog, setMog] = useState("");
  const [catalog, setCatalog] = useState({ ptrn: [], mog: [] });
  const [state, setState] = useState({ status: "idle", payload: null, message: "" });
  const [report, setReport] = useState({ status: "idle", markdown: "", fallback: false });
  const appliedFilters = useMemo(() => compactStatsFilters({ ptrn, mog }), [ptrn, mog]);

  useEffect(() => {
    if (!ready || !birthDate || !sex || !areaNm) {
      return;
    }
    const controller = new AbortController();
    const loadCatalog = async () => {
      try {
        const payload = await postScopeStats("health", { birthDate, sex, areaNm }, controller.signal);
        setCatalog({
          ptrn: uniqueFieldValues(payload.rows, "ptrn"),
          mog: uniqueFieldValues(payload.rows, "mog"),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setCatalog({ ptrn: [], mog: [] });
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
          "health",
          { birthDate, sex, areaNm },
          controller.signal,
          appliedFilters,
        );
        setState({ status: "success", payload, message: "" });
        const viewModel = buildHealthViewModel(payload);
        if (viewModel.rows.length === 0) {
          return;
        }
        setReport({ status: "loading", markdown: "", fallback: false });
        try {
          const result = await loadExplanation(
            "health",
            buildDisplayedHealthStats(payload, viewModel, appliedFilters),
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
            message: error.message || "실손 통계를 불러오지 못했습니다.",
          });
        }
      }
    };
    load();
    return () => controller.abort();
  }, [ready, birthDate, sex, areaNm, appliedFilters]);

  const viewModel = useMemo(
    () => (state.payload ? buildHealthViewModel(state.payload) : null),
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
      <Link href="/stats" className="inline-flex min-h-11 items-center text-[14px] text-brand">
        이전
      </Link>
      <h1 className="mt-4 text-[28px] font-bold leading-[1.25] text-ink">실손</h1>
      <p className="mt-3 text-base leading-6 text-ink-muted">
        같은 보험나이의 상품 보험료와 남녀 차이, 분포를 공공 통계로 살펴봅니다.
      </p>
      <ScopeFilterBar
        legend="실손 유형·담보"
        fields={[
          {
            id: "health-ptrn",
            label: "유형",
            value: ptrn,
            options: catalog.ptrn,
            onChange: setPtrn,
          },
          {
            id: "health-mog",
            label: "담보",
            value: mog,
            options: catalog.mog,
            onChange: setMog,
          },
        ]}
      />

      {state.status === "loading" || state.status === "idle" ? (
        <StatusPanel message="실손 통계를 불러오는 중입니다." />
      ) : null}
      {state.status === "error" ? (
        <StatusPanel message={state.message} tone="error" />
      ) : null}
      {state.status === "success" && viewModel?.rows.length === 0 ? (
        <StatusPanel message="조건에 맞는 실손 상품·레코드가 없습니다. 다른 시점에 다시 확인해 주세요." />
      ) : null}

      {state.status === "success" && viewModel?.rows.length ? (
        <HealthResults payload={state.payload} viewModel={viewModel} report={report} />
      ) : null}
    </section>
  );
}

/**
 * 로딩·오류·빈 데이터 경계를 같은 시각 패턴으로 알린다.
 */
function StatusPanel({ message, tone = "normal", action = null }) {
  return (
    <div
      className={`mt-6 rounded-[12px] border bg-surface p-5 text-[14px] ${
        tone === "error" ? "border-danger text-danger" : "border-border text-ink-muted"
      }`}
      role={tone === "error" ? "alert" : "status"}
    >
      <p>{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/**
 * 정상 실손 응답의 KPI·차트·표·AI·선택 CTA를 정해진 순서로 렌더한다.
 */
function HealthResults({ payload, viewModel, report }) {
  const caption = `${SOURCE_LABEL} · 기준년월 ${formatBasePeriod(payload.base_period || payload.as_of_date)} · 단위 원 · 견적 아님`;

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

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={`${viewModel.sex} 보험료 중앙값`} value={formatWon(viewModel.distribution?.median)} />
        <KpiCard label="상품·레코드 수" value={`${viewModel.productCount.toLocaleString("ko-KR")}건`} />
        <KpiCard label="화면 비교 행" value={`${viewModel.displayedCount.toLocaleString("ko-KR")}건`} />
      </div>
      {payload.truncated ? (
        <p className="text-[13px] text-ink-muted">
          상품·레코드 수가 많아 API가 일부 행만 반환했습니다. 수치는 가입자 수가 아닙니다.
        </p>
      ) : (
        <p className="text-[13px] text-ink-muted">
          상품·레코드 수는 조회된 상품 행의 개수이며 가입자 수가 아닙니다.
        </p>
      )}

      <ChartCard title={`${viewModel.sex} 상품 보험료 비교`} caption={caption}>
        {viewModel.barSeries.length ? (
          <HorizontalBarChart data={viewModel.barSeries} sex={viewModel.sex} />
        ) : (
          <p className="py-8 text-center text-[14px] text-ink-muted">
            선택 성별의 보험료 값이 없어 가로 막대를 표시하지 않습니다.
          </p>
        )}
      </ChartCard>

      {viewModel.dumbbellSeries.length ? (
        <ChartCard title="같은 상품의 남녀 보험료 비교" caption={caption}>
          <DumbbellChart data={viewModel.dumbbellSeries} />
        </ChartCard>
      ) : null}

      {viewModel.distribution ? (
        <ChartCard title={`${viewModel.sex} 보험료 분포 요약`} caption={caption}>
          <BoxSummaryChart summary={viewModel.distribution} sex={viewModel.sex} />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px] text-ink-muted sm:grid-cols-5">
            {[
              ["최소", viewModel.distribution.min],
              ["1사분위", viewModel.distribution.q1],
              ["중앙값", viewModel.distribution.median],
              ["3사분위", viewModel.distribution.q3],
              ["최대", viewModel.distribution.max],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="mt-1 font-medium text-ink">{formatWon(value)}</dd>
              </div>
            ))}
          </dl>
        </ChartCard>
      ) : null}

      <HealthComparisonTable rows={viewModel.tableRows} total={viewModel.displayedCount} caption={caption} />
      <ExplanationBlock report={report} />
      <OptionalActions />

      <Link href="/stats" className="inline-flex min-h-11 items-center text-[14px] text-brand">
        이전
      </Link>
    </div>
  );
}

/** 핵심 숫자를 차트 밖에서도 읽을 수 있게 제공한다. */
function KpiCard({ label, value }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <p className="text-[13px] text-ink-muted">{label}</p>
      <p className="mt-2 text-[24px] font-bold text-ink">{value}</p>
    </div>
  );
}

/** D3 SVG와 필수 출처 캡션을 같은 카드에 묶는다. */
function ChartCard({ title, caption, children }) {
  return (
    <figure className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
      <div className="mt-5 overflow-x-auto">{children}</div>
      <figcaption className="mt-4 text-[13px] leading-[1.4] text-ink-muted">{caption}</figcaption>
    </figure>
  );
}

/**
 * 남자·여자 보험료를 동시에 제공해 실손 비교를 두 열 이상으로 보장한다.
 */
function HealthComparisonTable({ rows, total, caption }) {
  return (
    <section className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-[18px] font-semibold text-ink">상품 보험료 표</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
          <caption className="sr-only">회사와 상품별 남자·여자 보험료 비교표</caption>
          <thead>
            <tr className="border-b border-border text-ink-muted">
              <th className="px-3 py-3 font-medium">회사</th>
              <th className="px-3 py-3 font-medium">상품</th>
              <th className="px-3 py-3 font-medium">유형</th>
              <th className="px-3 py-3 font-medium">담보</th>
              <th className="px-3 py-3 text-right font-medium">남자 보험료</th>
              <th className="px-3 py-3 text-right font-medium">여자 보험료</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0">
                <td className="px-3 py-3 text-ink">{row.company}</td>
                <td className="px-3 py-3 text-ink">{row.product}</td>
                <td className="px-3 py-3 text-ink-muted">{row.pattern}</td>
                <td className="px-3 py-3 text-ink-muted">{row.coverage}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink">{formatWon(row.male)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink">{formatWon(row.female)}</td>
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

/**
 * 리포트 API 설명과 공급자 실패 폴백을 동일한 쉬운 설명 블록으로 제공한다.
 */
function ExplanationBlock({ report }) {
  let content = "화면의 실손 집계를 바탕으로 쉬운 설명을 준비하고 있습니다.";
  if (report.status === "error") {
    content =
      "설명 생성에 실패했습니다. 위 표와 그래프는 공공 통계 참고값이며 가입을 권하거나 개인 보험료를 확정하지 않습니다.";
  } else if (report.status === "success") {
    content = report.markdown;
  }

  return (
    <section className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[18px] font-semibold text-ink">쉬운 설명</h2>
        {report.fallback ? (
          <span className="rounded-full bg-surface-muted px-2 py-1 text-[12px] text-ink-muted">
            기본 설명
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-3 text-[14px] leading-6 text-ink-muted" aria-live="polite">
        {String(content)
          .split(/\n+/)
          .filter(Boolean)
          .map((paragraph) => (
            <p key={paragraph}>{paragraph.replace(/^#+\s*/, "")}</p>
          ))}
      </div>
    </section>
  );
}

/**
 * 통계 탐색과 분리된 PDF·이메일 상담 선택 경로만 제공한다.
 */
function OptionalActions() {
  const button =
    "inline-flex min-h-11 items-center justify-center rounded-[10px] border border-border bg-surface px-4 text-[14px] font-medium text-ink hover:border-border-strong";
  return (
    <section>
      <p className="text-[13px] text-ink-muted">
        선택 사항 · 통계 탐색에는 연락처가 필요하지 않습니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/documents" className={button}>
          증권 PDF 업로드
        </Link>
        <Link href="/consultations" className={button}>
          이메일로 상담 신청
        </Link>
      </div>
    </section>
  );
}
