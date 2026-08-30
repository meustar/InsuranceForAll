import { readApiError } from "./stats-client";

/**
 * 운영 전용 same-origin 호출. 사용자 통계 프로필·생년월일은 보내지 않는다.
 */
async function opsFetch(path, init = {}) {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  return response;
}

/**
 * 운영 쿠키 존재만 확인한다. 401이면 로그인 화면으로 보낸다.
 */
export async function getOpsSession() {
  const response = await opsFetch("/api/v1/ops/session");
  return response.ok;
}

/**
 * 환경변수 운영 계정과만 비교한다. 비밀번호는 로그·URL에 두지 않는다.
 */
export async function loginOps(username, password) {
  const response = await opsFetch("/api/v1/ops/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, "운영 접속에 실패했습니다."));
  }
}

/**
 * 운영 쿠키만 만료한다. 사용자 ifa_anon은 건드리지 않는다.
 */
export async function logoutOps() {
  const response = await opsFetch("/api/v1/ops/session", { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await readApiError(response, "로그아웃에 실패했습니다."));
  }
}

/**
 * F-10 대시보드. GA4·gtag를 호출하지 않는다.
 */
export async function getOpsDashboard() {
  const response = await opsFetch("/api/v1/ops/dashboard");
  if (response.status === 401) {
    const error = new Error("운영 로그인이 필요합니다.");
    error.status = 401;
    throw error;
  }
  if (!response.ok) {
    throw new Error(await readApiError(response, "대시보드를 불러오지 못했습니다."));
  }
  return response.json();
}

/**
 * F-11 배치만 큐에 넣는다. seed·포털 키는 보내지 않는다.
 */
export async function queueOpsSync() {
  const response = await opsFetch("/api/v1/ops/sync", { method: "POST" });
  if (!response.ok) {
    throw new Error(await readApiError(response, "동기화를 시작하지 못했습니다."));
  }
  return response.json();
}

/**
 * F-09 다건 PDF. 원본 파일명은 별도 필드로 넣지 않는다.
 */
export async function uploadOpsPdfs(files) {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  const response = await opsFetch("/api/v1/ops/documents", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, "PDF를 올리지 못했습니다."));
  }
  return response.json();
}
