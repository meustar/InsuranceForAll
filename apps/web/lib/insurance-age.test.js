import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { insuranceAge, parseCivilDate } from "./insurance-age.js";

function d(iso) {
  return parseCivilDate(iso);
}

describe("insuranceAge", () => {
  it("adds a year on the six-month anniversary", () => {
    const birth = d("1990-03-15");
    assert.equal(insuranceAge(birth, d("2026-09-14")), 36);
    assert.equal(insuranceAge(birth, d("2026-09-15")), 37);
  });

  it("uses calendar months for month-end and leap day", () => {
    assert.equal(insuranceAge(d("2020-08-31"), d("2026-02-28")), 6);
    assert.equal(insuranceAge(d("2000-02-29"), d("2025-02-28")), 25);
    assert.equal(insuranceAge(d("2000-02-29"), d("2025-08-28")), 26);
  });

  it("rejects a birth after as-of", () => {
    assert.throws(() => insuranceAge(d("2030-01-01"), d("2026-08-26")), /future_birth/);
  });
});
