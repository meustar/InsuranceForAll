import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CONSULT_RATIONALE,
  FALLBACK_NOTICE,
  SUCCESS_MESSAGE,
  validateConsultForm,
} from "./consultations.js";

const root = dirname(fileURLToPath(import.meta.url));

describe("consultation form helpers", () => {
  it("requires consent, notice version, and email only", () => {
    assert.equal(
      validateConsultForm({ email: "user@example.com", consentAgreed: false, noticeVersion: "v1" }).ok,
      false,
    );
    assert.equal(
      validateConsultForm({ email: "user@example.com", consentAgreed: true, noticeVersion: "" }).ok,
      false,
    );
    assert.equal(
      validateConsultForm({ email: "not-an-email", consentAgreed: true, noticeVersion: "v1" }).ok,
      false,
    );
    assert.equal(
      validateConsultForm({ email: "user@example.com", consentAgreed: true, noticeVersion: "v1" }).ok,
      true,
    );
  });

  it("covers purpose items retention and refusal without phone copy", () => {
    const blob = [
      FALLBACK_NOTICE.purpose,
      FALLBACK_NOTICE.items,
      FALLBACK_NOTICE.retention,
      FALLBACK_NOTICE.refusal,
      CONSULT_RATIONALE,
      SUCCESS_MESSAGE,
    ].join("\n");
    assert.match(blob, /목적|상담/);
    assert.match(FALLBACK_NOTICE.items, /이메일/);
    assert.match(FALLBACK_NOTICE.retention, /보유|삭제/);
    assert.match(FALLBACK_NOTICE.refusal, /동의하지 않으면/);
    assert.equal(blob.includes("전화 상담"), false);
    assert.equal(FALLBACK_NOTICE.items.includes("전화"), false);
  });

  it("keeps consultation and document markup free of phone fields", () => {
    const files = [
      join(root, "../components/consultations/ConsultationFormPage.jsx"),
      join(root, "../components/documents/DocumentUploadPage.jsx"),
    ];
    const blob = files.map((path) => readFileSync(path, "utf8")).join("\n");
    assert.equal(blob.includes("전화 상담"), false);
    assert.equal(blob.includes('type="tel"'), false);
    assert.equal(blob.includes('name="phone"'), false);
    assert.match(blob, /통계로 돌아가기/);
    assert.match(blob, /목적/);
    assert.match(blob, /항목/);
    assert.match(blob, /보유기간/);
    assert.match(blob, /거부권/);
    assert.match(blob, /role="dialog"/);
    assert.match(blob, /개인정보 처리 고지/);
    assert.match(blob, /업로드/);
  });
});
