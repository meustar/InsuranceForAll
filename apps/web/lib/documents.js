export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * 브라우저에서 PDF 형식·크기만 본다. 원본 파일명은 서버로 따로 보내지 않는다.
 */
export function validatePdfFile(file) {
  if (!file) {
    return { ok: false, message: "PDF 파일을 선택하세요." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, message: "PDF는 10MB 이하여야 합니다." };
  }
  const typeOk = file.type === "application/pdf";
  const name = typeof file.name === "string" ? file.name : "";
  const extOk = name.toLowerCase().endsWith(".pdf");
  if (!typeOk && !extOk) {
    return { ok: false, message: "PDF 파일만 업로드할 수 있습니다." };
  }
  return { ok: true };
}

export function statusTone(status) {
  if (status === "completed") {
    return "done";
  }
  if (status === "failed") {
    return "error";
  }
  return "pending";
}

export function statusLabel(status) {
  if (status === "queued") {
    return "대기 중";
  }
  if (status === "processing") {
    return "처리 중";
  }
  if (status === "completed") {
    return "완료";
  }
  if (status === "failed") {
    return "실패";
  }
  return "확인 중";
}
