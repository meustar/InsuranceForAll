import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAutoViewModel,
  buildDisplayedAutoStats,
  formatCount,
} from "./auto-stats.js";

const rows = [
  {
    isu_itms_nm: "개인용",
    mog_clsf_nm: "대인",
    atmb_plor_nm: "국산",
    kncr_nm: "소형",
    isu_cmpy_ofr_ym: "202601",
    join_cnt: 10,
    elps_inpm: "100000",
  },
  {
    isu_itms_nm: "개인용",
    mog_clsf_nm: "대물",
    atmb_plor_nm: "국산",
    kncr_nm: "중형",
    isu_cmpy_ofr_ym: "202601",
    join_cnt: 4,
    elps_inpm: "80000",
  },
];

describe("auto stats normalization", () => {
  it("keeps join counts and elapsed premium on separate series", () => {
    const viewModel = buildAutoViewModel({ rows, row_count: 2 });
    assert.equal(viewModel.totalJoin, 14);
    assert.equal(viewModel.totalPremium, 180000);
    assert.equal(viewModel.perVehicle, 180000 / 14);
    assert.ok(viewModel.joinSeries.every((item) => typeof item.value === "number"));
    assert.ok(viewModel.premiumSeries.every((item) => typeof item.value === "number"));
    assert.notDeepEqual(
      viewModel.joinSeries.map((item) => item.value),
      viewModel.premiumSeries.map((item) => item.value),
    );
  });

  it("omits profile originals from AI input", () => {
    const payload = {
      rows,
      row_count: 2,
      sex: "남자",
      area_nm: "서울",
      insurance_age: 40,
      stale: false,
      base_period: "202601",
      source: "auto",
      disclaimer: "참고용",
      as_of_date: "2026-08-26",
      truncated: false,
    };
    const displayed = buildDisplayedAutoStats(payload, buildAutoViewModel(payload), {
      mogClsfNm: "대인",
    });
    const encoded = JSON.stringify(displayed);
    assert.equal(displayed.highlights.applied_filters.mogClsfNm, "대인");
    assert.equal(encoded.includes("birth"), false);
    assert.equal(encoded.includes("area_nm"), false);
    assert.equal(encoded.includes("insurance_age"), false);
    assert.equal(displayed.series.join_cnt.length > 0, true);
    assert.equal(displayed.series.elps_inpm_won.length > 0, true);
    assert.equal(formatCount(10), "10대");
  });

  it("uses the latest offer month and does not mix older months into totals", () => {
    const mixed = [
      { ...rows[0], isu_cmpy_ofr_ym: "202512", join_cnt: 99, elps_inpm: "1" },
      ...rows,
    ];
    const viewModel = buildAutoViewModel({ rows: mixed, row_count: 3 });
    assert.equal(viewModel.period, "202601");
    assert.equal(viewModel.totalJoin, 14);
  });
});
