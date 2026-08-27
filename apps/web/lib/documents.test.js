import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_PDF_BYTES, statusTone, validatePdfFile } from "./documents.js";

describe("document upload helpers", () => {
  it("rejects missing and oversized files", () => {
    assert.equal(validatePdfFile(null).ok, false);
    assert.equal(validatePdfFile({ size: MAX_PDF_BYTES + 1, type: "application/pdf", name: "x.pdf" }).ok, false);
  });

  it("accepts pdf type without sending a separate filename field", () => {
    const result = validatePdfFile({ size: 12, type: "application/pdf", name: "policy.pdf" });
    assert.equal(result.ok, true);
    assert.equal(statusTone("queued"), "pending");
    assert.equal(statusTone("completed"), "done");
    assert.equal(statusTone("failed"), "error");
  });
});
