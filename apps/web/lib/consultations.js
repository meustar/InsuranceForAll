/** API 고지를 못 받아도 화면에 목적·항목·보유·거부권을 보여 주기 위한 고정 문구. */

export const FALLBACK_NOTICE = Object.freeze({
  version: "",
  purpose:
    "상담 연락을 위해 이메일과 선택 메모를 암호화해 보관합니다. 통계 탐색에는 연락처가 필요하지 않습니다.",
  items: "이메일(필수), 상담 메모(선택)",
  retention: "접수일로부터 설정된 보유기간(기본 30일)이 지나면 행을 삭제합니다.",
  refusal: "동의하지 않으면 상담을 접수하지 않습니다. 통계 조회는 동의 없이 이용할 수 있습니다.",
  contact_channel: "email",
});

export const SUCCESS_MESSAGE = "접수되었습니다. 이메일로 연락드립니다.";

export const CONSULT_RATIONALE =
  "통계 확인에는 연락처가 필요 없으며, 상담을 원하실 때만 이메일을 받습니다.";

/**
 * 필수 이메일만 검사한다. 값은 로그에 남기지 않는다.
 */
export function validateConsultForm({ email, consentAgreed, noticeVersion }) {
  if (!consentAgreed) {
    return { ok: false, message: "상담 접수에는 동의 확인이 필요합니다." };
  }
  if (!noticeVersion) {
    return { ok: false, message: "동의 고지를 불러온 뒤에 접수할 수 있습니다." };
  }
  const trimmed = String(email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, message: "이메일 주소를 입력하세요." };
  }
  return { ok: true, email: trimmed };
}
