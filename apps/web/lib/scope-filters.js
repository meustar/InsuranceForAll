/**
 * 스코프 탭 필터 값을 POST JSON 선택 필드에만 싣기 위해 정규화한다.
 */

/**
 * 캐시 행에서 비어 있지 않은 필드 값을 중복 없이 고른다.
 */
export function uniqueFieldValues(rows, field) {
  if (!Array.isArray(rows)) {
    return [];
  }
  const seen = new Set();
  for (const row of rows) {
    const raw = row?.[field];
    if (raw === null || raw === undefined) {
      continue;
    }
    const value = String(raw).trim();
    if (!value || value === "—") {
      continue;
    }
    seen.add(value);
  }
  return [...seen].sort((left, right) => left.localeCompare(right, "ko"));
}

/**
 * 빈 문자열은 필터 미적용으로 보고 본문에 넣지 않는다.
 */
export function compactStatsFilters(filters) {
  const body = {};
  if (!filters || typeof filters !== "object") {
    return body;
  }
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      body[key] = trimmed;
    }
  }
  return body;
}
