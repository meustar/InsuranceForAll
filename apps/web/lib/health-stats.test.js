import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDisplayedHealthStats,
  buildHealthViewModel,
  normalizeHealthRows,
  summarizeDistribution,
  toBarSeries,
  toDumbbellSeries,
} from "./health-stats.js";

const rows = [
  {
    cmpy_cd: "A",
    cmpy_nm: "회사A",
    prd_nm: "상품A",
    ptrn: "유형A",
    mog: "담보A",
    ml_ins_rt: "10000.00",
    fml_ins_rt: "12000.00",
    bas_dt: "2026-01-01",
  },
  {
    cmpy_cd: "B",
    cmpy_nm: "회사B",
    prd_nm: "상품B",
    ptrn: "유형B",
    mog: "담보B",
    ml_ins_rt: "20000.00",
    fml_ins_rt: "18000.00",
    bas_dt: "2026-01-01",
  },
  {
    cmpy_cd: "C",
    cmpy_nm: "회사C",
    prd_nm: "상품C",
    ptrn: "유형C",
    mog: "담보C",
    ml_ins_rt: null,
    fml_ins_rt: "30000.00",
    bas_dt: "2026-01-01",
  },
];

describe("health stats normalization", () => {
  it("keeps male and female rates as separate comparison columns", () => {
    const normalized = normalizeHealthRows(rows);
    assert.equal(normalized.length, 3);
    assert.equal(normalized[0].male, 10000);
    assert.equal(normalized[0].female, 12000);
    assert.equal(toDumbbellSeries(normalized).length, 2);
  });

  it("uses selected-sex rates for bars and quartiles", () => {
    const normalized = normalizeHealthRows(rows);
    assert.deepEqual(
      toBarSeries(normalized, "남자").map((item) => item.value),
      [20000, 10000],
    );
    const female = summarizeDistribution(normalized, "여자");
    assert.equal(female.median, 18000);
    assert.equal(female.min, 12000);
    assert.equal(female.max, 30000);
  });

  it("treats row_count as product records and omits profile originals from AI input", () => {
    const payload = {
      scope: "health",
      sex: "여자",
      area_nm: "서울",
      insurance_age: 30,
      row_count: 12,
      rows,
      stale: false,
      base_period: "202601",
      source: "medical",
      disclaimer: "참고용",
      as_of_date: "2026-08-26",
      truncated: false,
    };
    const viewModel = buildHealthViewModel(payload);
    assert.equal(viewModel.productCount, 12);
    const displayed = buildDisplayedHealthStats(payload, viewModel);
    const encoded = JSON.stringify(displayed);
    assert.equal(encoded.includes("birth"), false);
    assert.equal(encoded.includes("area_nm"), false);
    assert.equal(encoded.includes("insurance_age"), false);
    assert.equal(displayed.row_count, 12);
  });
});
