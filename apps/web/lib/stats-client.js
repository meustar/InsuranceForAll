/**
 * 스코프 통계·리포트 호출. 생년월일은 stats POST 본문에만 두고 URL에 넣지 않는다.
 */

export async function readApiError(response, fallback) {
  try {
    const body = await response.json();
    return typeof body.detail === "string" ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 세션 프로필과 스코프 선택 필터를 JSON 본문으로만 보낸다. 쿼리 문자열은 쓰지 않는다.
 */
export async function postScopeStats(scope, profile, signal, filters = {}) {
  const response = await fetch(`/api/v1/stats/${scope}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      birthDate: profile.birthDate,
      sex: profile.sex,
      areaNm: profile.areaNm,
      ...filters,
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, "통계를 불러오지 못했습니다."));
  }
  return response.json();
}

/**
 * 화면 집계만 리포트 API에 전달하고 일회성 토큰은 함수 메모리에서 바로 소진한다.
 */
export async function loadExplanation(scope, displayedStats, signal) {
  const created = await fetch("/api/v1/reports", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, displayedStats }),
    signal,
  });
  if (!created.ok) {
    throw new Error("설명을 만들지 못했습니다.");
  }
  const { report_id: reportId, access_token: accessToken } = await created.json();
  if (!reportId || !accessToken) {
    throw new Error("설명 응답이 올바르지 않습니다.");
  }
  const report = await fetch(`/api/v1/reports/${encodeURIComponent(reportId)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  if (!report.ok) {
    throw new Error("설명을 불러오지 못했습니다.");
  }
  return report.json();
}
