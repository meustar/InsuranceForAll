import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compactStatsFilters, uniqueFieldValues } from "./scope-filters.js";

describe("scope filter helpers", () => {
  it("collects unique cache labels and ignores empty placeholders", () => {
    const values = uniqueFieldValues(
      [{ ptrn: "급여" }, { ptrn: "급여" }, { ptrn: "—" }, { ptrn: " " }, { ptrn: "비급여" }],
      "ptrn",
    );
    assert.deepEqual(values, ["급여", "비급여"]);
  });

  it("omits empty filter keys so POST body does not send unused fields", () => {
    assert.deepEqual(compactStatsFilters({ ptrn: "급여", mog: "" }), { ptrn: "급여" });
    assert.deepEqual(compactStatsFilters({ ptrn: "  " }), {});
  });
});
