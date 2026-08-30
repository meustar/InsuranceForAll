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
    key: `${row.isu_kind_nm || "kind"}-${row.stts_accml_trgt_yr || ""}-${row.sex_nm || ""}-${index}`,
    kind: String(row.isu_kind_nm || "—"),
    year: String(row.stts_accml_trgt_yr || "—"),
    sex: String(row.sex_nm || ""),
    joinCount: finiteNumber(row.join_cnt),
    joinRate: finiteNumber(row.join_rto),
  }));
}

function latestYear(rows) {
  const years = rows.map((row) => row.year).filter((year) => year && year !== "—").sort();
  return years.length ? years[years.length - 1] : null;
}

/**
 * 종류별로 남·여 가입율이 모두 있을 때만 덤벨 점을 만든다. 한쪽만 있으면 뺀다.
 */
function toLifeDumbbellSeries(rows) {
  const byKind = new Map();
  for (const row of rows) {
    if (row.joinRate === null) {
      continue;
    }
    const bucket = byKind.get(row.kind) || { label: row.kind, male: null, female: null };
    if (row.sex === "남자") {
      bucket.male = row.joinRate;
    }
    if (row.sex === "여자") {
      bucket.female = row.joinRate;
    }
    byKind.set(row.kind, bucket);
  }
  return [...byKind.entries()]
    .filter(([, pair]) => pair.male !== null && pair.female !== null)
    .map(([kind, pair]) => ({
      key: kind,
      label: pair.label,
      male: pair.male,
      female: pair.female,
    }))
    .sort((left, right) => Math.max(right.male, right.female) - Math.max(left.male, left.female))
    .slice(0, MAX_CHART_ROWS);
}
function toKindSeries(rows, valueField) {
  return rows
    .filter((row) => row[valueField] !== null && row[valueField] > 0)
    .map((row) => ({
      key: `${row.kind}-${row.year}-${row.sex || ""}`,
      label: row.kind,
      value: row[valueField],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_CHART_ROWS);
}

/**
 * 생명 응답을 율 차트와 건수 표·차트가 섞이지 않게 나눈다.
 * 막대는 세션 성별만, 덤벨은 남·여 가입율이 모두 있을 때만 만든다.
 */
export function buildLifeViewModel(payload) {
  const allRows = normalizeLifeRows(payload?.rows);
  const year = latestYear(allRows);
  const rows = year ? allRows.filter((row) => row.year === year) : allRows;
  const sex = payload?.sex === "여자" ? "여자" : payload?.sex === "남자" ? "남자" : "";
  const sexRows = sex ? rows.filter((row) => !row.sex || row.sex === sex) : rows;
  const totalJoin = sexRows.reduce((sum, row) => sum + (row.joinCount || 0), 0);
  return {
    rows: sexRows,
    tableRows: sexRows.slice(0, MAX_TABLE_ROWS),
    rateSeries: toKindSeries(sexRows, "joinRate"),
    countSeries: toKindSeries(sexRows, "joinCount"),
    dumbbellSeries: toLifeDumbbellSeries(rows),
    totalJoin,
    year,
    sex,
    rowCount: Number.isInteger(payload?.row_count) ? payload.row_count : allRows.length,
  };
}

/**
 * AI에는 종류별 건수·가입율만 넣고 세션 프로필 원문은 제외한다.
 */
export function buildDisplayedLifeStats(payload, viewModel, appliedFilters = {}) {
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
      applied_filters: appliedFilters,
    },
    series: {
      join_rto_percent: viewModel.rateSeries,
      join_cnt_geon: viewModel.countSeries,
      male_female_join_rto: viewModel.dumbbellSeries,
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
