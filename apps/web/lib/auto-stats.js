import { formatWon } from "./health-stats.js";

const MAX_CHART_ROWS = 10;
const MAX_TABLE_ROWS = 40;

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function autoLabel(row) {
  return [row.item, row.coverage, row.carType].filter((part) => part && part !== "—").join(" · ");
}

/**
 * 자동차 캐시 행을 가입대수·경과보험료가 분리된 화면 행으로 정규화한다.
 */
export function normalizeAutoRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row, index) => ({
    key: [
      row.isu_itms_nm,
      row.mog_clsf_nm,
      row.atmb_plor_nm,
      row.kncr_nm,
      index,
    ].join("-"),
    item: String(row.isu_itms_nm || "—"),
    coverage: String(row.mog_clsf_nm || "—"),
    origin: String(row.atmb_plor_nm || "—"),
    carType: String(row.kncr_nm || "—"),
    period: String(row.isu_cmpy_ofr_ym || ""),
    joinCount: finiteNumber(row.join_cnt),
    elapsedPremium: finiteNumber(row.elps_inpm),
  }));
}

/**
 * 담보·차종 라벨마다 경과보험료÷가입대수로 대당평균 시리즈를 만든다.
 */
function toPerVehicleSeries(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!row.joinCount || row.joinCount <= 0 || row.elapsedPremium === null) {
      continue;
    }
    const label = autoLabel(row) || "미분류";
    const prev = grouped.get(label) || { join: 0, premium: 0 };
    grouped.set(label, {
      join: prev.join + row.joinCount,
      premium: prev.premium + row.elapsedPremium,
    });
  }
  return [...grouped.entries()]
    .map(([label, parts]) => ({
      key: label,
      label,
      value: parts.premium / parts.join,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, MAX_CHART_ROWS);
}
function toSeparatedBarSeries(rows, valueField, labelFn) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[valueField];
    if (value === null || value <= 0) {
      continue;
    }
    const label = labelFn(row) || "미분류";
    grouped.set(label, (grouped.get(label) || 0) + value);
  }
  return [...grouped.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_CHART_ROWS);
}

function latestValue(rows, field) {
  const values = rows.map((row) => row[field]).filter(Boolean).sort();
  return values.length ? values[values.length - 1] : null;
}

function rowsInPeriod(rows, field, period) {
  if (!period) {
    return rows;
  }
  return rows.filter((row) => row[field] === period);
}

/**
 * 자동차 응답을 KPI·분리 차트·표에서 같이 쓰는 뷰 모델로 만든다.
 * 여러 연월이 있으면 최신 연월만 써서 기간을 섞어 더하지 않는다.
 */
export function buildAutoViewModel(payload) {
  const allRows = normalizeAutoRows(payload?.rows);
  const period = latestValue(allRows, "period");
  const rows = rowsInPeriod(allRows, "period", period);
  const totalJoin = rows.reduce((sum, row) => sum + (row.joinCount || 0), 0);
  const totalPremium = rows.reduce((sum, row) => sum + (row.elapsedPremium || 0), 0);
  return {
    rows,
    tableRows: rows.slice(0, MAX_TABLE_ROWS),
    joinSeries: toSeparatedBarSeries(rows, "joinCount", autoLabel),
    premiumSeries: toSeparatedBarSeries(rows, "elapsedPremium", autoLabel),
    perVehicleSeries: toPerVehicleSeries(rows),
    totalJoin,
    totalPremium,
    perVehicle: totalJoin > 0 ? totalPremium / totalJoin : null,
    period,
    rowCount: Number.isInteger(payload?.row_count) ? payload.row_count : allRows.length,
  };
}

/**
 * AI에는 화면에 표시한 대수·경과보험료 집계만 넣고 프로필 원문은 제외한다.
 */
export function buildDisplayedAutoStats(payload, viewModel, appliedFilters = {}) {
  return {
    scope: "auto",
    stale: Boolean(payload.stale),
    stale_message: payload.stale_message || null,
    as_of_date: payload.as_of_date,
    base_period: payload.base_period,
    source: payload.source,
    row_count: viewModel.rowCount,
    truncated: Boolean(payload.truncated),
    disclaimer: payload.disclaimer,
    adapter_note: payload.adapter_note || null,
    highlights: {
      join_cnt_sum: viewModel.totalJoin,
      elps_inpm_sum: viewModel.totalPremium,
      average_elps_per_join: viewModel.perVehicle,
      isu_cmpy_ofr_ym: viewModel.period,
      applied_filters: appliedFilters,
    },
    series: {
      join_cnt: viewModel.joinSeries,
      elps_inpm_won: viewModel.premiumSeries,
      average_elps_per_join_won: viewModel.perVehicleSeries,
    },
  };
}

export function formatCount(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${Math.round(value).toLocaleString("ko-KR")}대`;
}

export function formatAxisCount(value) {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }
  return Math.round(value).toLocaleString("ko-KR");
}

export { formatWon };
