const MAX_CHART_ROWS = 10;
const MAX_TABLE_ROWS = 40;

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/**
 * 생명 캐시 행을 가입건수(건)와 가입율(%)로 정규화한다. 인원 수로 읽히게 하지 않는다.
 */
export function normalizeLifeRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row, index) => ({
    key: `${row.isu_kind_nm || "kind"}-${row.stts_accml_trgt_yr || ""}-${index}`,
    kind: String(row.isu_kind_nm || "—"),
    year: String(row.stts_accml_trgt_yr || "—"),
    joinCount: finiteNumber(row.join_cnt),
    joinRate: finiteNumber(row.join_rto),
  }));
}

function latestYear(rows) {
  const years = rows.map((row) => row.year).filter((year) => year && year !== "—").sort();
  return years.length ? years[years.length - 1] : null;
}

function toKindSeries(rows, valueField) {
  return rows
    .filter((row) => row[valueField] !== null && row[valueField] > 0)
    .map((row) => ({
      key: `${row.kind}-${row.year}`,
      label: row.kind,
      value: row[valueField],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_CHART_ROWS);
}

/**
 * 생명 응답을 율 차트와 건수 표·차트가 섞이지 않게 나눈다.
 * 여러 연도가 있으면 최신 연도만 써서 가입율을 더하지 않는다.
 */
export function buildLifeViewModel(payload) {
  const allRows = normalizeLifeRows(payload?.rows);
  const year = latestYear(allRows);
  const rows = year ? allRows.filter((row) => row.year === year) : allRows;
  const totalJoin = rows.reduce((sum, row) => sum + (row.joinCount || 0), 0);
  return {
    rows,
    tableRows: rows.slice(0, MAX_TABLE_ROWS),
    rateSeries: toKindSeries(rows, "joinRate"),
    countSeries: toKindSeries(rows, "joinCount"),
    totalJoin,
    year,
    rowCount: Number.isInteger(payload?.row_count) ? payload.row_count : allRows.length,
  };
}

/**
 * AI에는 종류별 건수·가입율만 넣고 세션 프로필 원문은 제외한다.
 */
export function buildDisplayedLifeStats(payload, viewModel) {
  return {
    scope: "life",
    stale: Boolean(payload.stale),
    stale_message: payload.stale_message || null,
    as_of_date: payload.as_of_date,
    base_period: payload.base_period,
    source: payload.source,
    row_count: viewModel.rowCount,
    truncated: Boolean(payload.truncated),
    disclaimer: payload.disclaimer,
    highlights: {
      join_cnt_sum_geon: viewModel.totalJoin,
      displayed_kinds: viewModel.tableRows.length,
      stts_accml_trgt_yr: viewModel.year,
    },
    series: {
      join_rto_percent: viewModel.rateSeries,
      join_cnt_geon: viewModel.countSeries,
    },
  };
}

export function formatJoinCount(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${Math.round(value).toLocaleString("ko-KR")}건`;
}

export function formatJoinRate(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

export function formatAxisRate(value) {
  return `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}`;
}

export function formatAxisCount(value) {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}만`;
  }
  return Math.round(value).toLocaleString("ko-KR");
}
