const MAX_CHART_ROWS = 10;
const MAX_TABLE_ROWS = 40;

function finiteRate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function rowLabel(row) {
  const company = String(row.cmpy_nm || "회사 미상").trim();
  const product = String(row.prd_nm || "상품 미상").trim();
  return `${company} · ${product}`;
}

function quantileSorted(values, probability) {
  if (values.length === 0) {
    return null;
  }
  const index = (values.length - 1) * probability;
  const lower = Math.floor(index);
  const fraction = index - lower;
  const upper = values[lower + 1];
  return upper === undefined ? values[lower] : values[lower] + fraction * (upper - values[lower]);
}

/**
 * API 실손 행을 화면에 표시할 보험료 비교 행으로 정규화한다.
 */
export function normalizeHealthRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((row, index) => ({
      key: `${row.cmpy_cd || row.cmpy_nm || "company"}-${row.prd_nm || index}-${row.mog || ""}`,
      label: rowLabel(row),
      company: String(row.cmpy_nm || "—"),
      product: String(row.prd_nm || "—"),
      pattern: String(row.ptrn || "—"),
      coverage: String(row.mog || "—"),
      male: finiteRate(row.ml_ins_rt),
      female: finiteRate(row.fml_ins_rt),
      baseDate: String(row.bas_dt || ""),
      provider: String(row.ofr_inst_nm || ""),
    }))
    .filter((row) => row.male !== null || row.female !== null);
}

/**
 * 선택 성별의 회사·상품 보험료를 가로 막대용으로 만든다.
 */
export function toBarSeries(rows, sex) {
  const field = sex === "여자" ? "female" : "male";
  return rows
    .filter((row) => row[field] !== null)
    .map((row) => ({ key: row.key, label: row.label, value: row[field] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_CHART_ROWS);
}

/**
 * 남녀 보험료가 모두 있는 행만 덤벨 비교용으로 만든다.
 */
export function toDumbbellSeries(rows) {
  return rows
    .filter((row) => row.male !== null && row.female !== null)
    .map((row) => ({ key: row.key, label: row.label, male: row.male, female: row.female }))
    .sort((a, b) => Math.max(b.male, b.female) - Math.max(a.male, a.female))
    .slice(0, MAX_CHART_ROWS);
}

/**
 * 선택 성별 보험료의 최소·사분위·최대값과 점 분포를 계산한다.
 */
export function summarizeDistribution(rows, sex) {
  const field = sex === "여자" ? "female" : "male";
  const values = rows
    .map((row) => row[field])
    .filter((value) => value !== null)
    .sort((a, b) => a - b);
  if (values.length === 0) {
    return null;
  }
  return {
    min: values[0],
    q1: quantileSorted(values, 0.25),
    median: quantileSorted(values, 0.5),
    q3: quantileSorted(values, 0.75),
    max: values[values.length - 1],
    values,
  };
}

/**
 * 통계 응답을 KPI·차트·표에서 함께 쓰는 실손 뷰 모델로 만든다.
 */
export function buildHealthViewModel(payload) {
  const rows = normalizeHealthRows(payload?.rows);
  const sex = payload?.sex === "여자" ? "여자" : "남자";
  const distribution = summarizeDistribution(rows, sex);
  return {
    rows,
    tableRows: rows.slice(0, MAX_TABLE_ROWS),
    barSeries: toBarSeries(rows, sex),
    dumbbellSeries: toDumbbellSeries(rows),
    distribution,
    sex,
    productCount: Number.isInteger(payload?.row_count) ? payload.row_count : rows.length,
    displayedCount: rows.length,
  };
}

/**
 * AI에는 화면에 표시한 집계·시리즈·필터 라벨만 넣고 세션 프로필 원문은 제외한다.
 */
export function buildDisplayedHealthStats(payload, viewModel, appliedFilters = {}) {
  return {
    scope: "health",
    stale: Boolean(payload.stale),
    stale_message: payload.stale_message || null,
    as_of_date: payload.as_of_date,
    base_period: payload.base_period,
    source: payload.source,
    row_count: viewModel.productCount,
    truncated: Boolean(payload.truncated),
    disclaimer: payload.disclaimer,
    highlights: {
      selected_sex: viewModel.sex,
      median_won: viewModel.distribution?.median ?? null,
      displayed_records: viewModel.displayedCount,
      applied_filters: appliedFilters,
    },
    series: {
      selected_sex_rates_won: viewModel.barSeries,
      male_female_rates_won: viewModel.dumbbellSeries,
      distribution_won: viewModel.distribution
        ? {
            min: viewModel.distribution.min,
            q1: viewModel.distribution.q1,
            median: viewModel.distribution.median,
            q3: viewModel.distribution.q3,
            max: viewModel.distribution.max,
          }
        : null,
    },
  };
}

export function formatWon(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

/**
 * 캐시 기준 YYYYMM 또는 YYYY-MM 값을 읽기 쉬운 년월로 표시한다.
 */
export function formatBasePeriod(value) {
  const text = String(value || "");
  if (/^\d{6}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text.slice(0, 7);
  }
  return text || "기준일 미상";
}
