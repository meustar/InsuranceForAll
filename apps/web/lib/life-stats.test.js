import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildDisplayedLifeStats,
  buildLifeViewModel,
  formatJoinCount,
} from "./life-stats.js";

const rows = [
  { isu_kind_nm: "종신", stts_accml_trgt_yr: "2024", join_cnt: 100, join_rto: "12.5" },
  { isu_kind_nm: "정기", stts_accml_trgt_yr: "2024", join_cnt: 40, join_rto: "4.2" },
];

describe("life stats normalization", () => {
  it("keeps join counts in geon and rates on separate series", () => {
    const viewModel = buildLifeViewModel({ rows, row_count: 2 });
    assert.equal(viewModel.totalJoin, 140);
    assert.deepEqual(
      viewModel.rateSeries.map((item) => item.value),
      [12.5, 4.2],
    );
    assert.deepEqual(
      viewModel.countSeries.map((item) => item.value),
      [100, 40],
    );
    assert.equal(formatJoinCount(100), "100건");
  });

  it("keeps the latest year only so rates are not added across years", () => {
    const mixed = [
      { isu_kind_nm: "종신", stts_accml_trgt_yr: "2023", join_cnt: 999, join_rto: "90" },
      ...rows,
    ];
    const viewModel = buildLifeViewModel({ rows: mixed, row_count: 3 });
    assert.equal(viewModel.year, "2024");
    assert.equal(viewModel.totalJoin, 140);
    assert.equal(
      viewModel.rateSeries.some((item) => item.value === 90),
      false,
    );
  });

  it("omits profile originals and does not label counts as people", () => {
    const payload = {
      rows,
      row_count: 2,
      sex: "여자",
      area_nm: "경기",
      insurance_age: 35,
      stale: false,
      base_period: "2024",
      source: "life",
      disclaimer: "참고용",
      as_of_date: "2026-08-26",
      truncated: false,
    };
    const displayed = buildDisplayedLifeStats(payload, buildLifeViewModel(payload), {
      isuKindNm: "종신",
    });
    const encoded = JSON.stringify(displayed);
    assert.equal(encoded.includes("birth"), false);
    assert.equal(encoded.includes("area_nm"), false);
    assert.equal(encoded.includes("insurance_age"), false);
    assert.equal(encoded.includes("명"), false);
    assert.ok(Object.hasOwn(displayed.series, "join_cnt_geon"));
    assert.ok(Object.hasOwn(displayed.series, "join_rto_percent"));
  });

  it("keeps life page copy free of people-count wording", () => {
    const root = dirname(fileURLToPath(import.meta.url));
    const page = readFileSync(join(root, "../components/life/LifeStatsPage.jsx"), "utf8");
    assert.match(page, /가입건수는 건/);
    assert.equal(/\d+명/.test(page), false);
    assert.equal(page.includes("명 단위"), false);
  });
});
