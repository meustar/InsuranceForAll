import { LIFE_AREA_NAMES, SEX_VALUES } from "./life-areas.js";
import { parseCivilDate, seoulToday } from "./insurance-age.js";

export const PROFILE_STORAGE_KEY = "ifa.profile.v1";
export const PROFILE_IDLE_MS = 30 * 60 * 1000;

/**
 * 세션 프로필 필드만 검증한다. 값은 URL·쿠키에 넣지 않는다.
 */
export function validateProfileFields({ birthDate, sex, areaNm }) {
  const birth = parseCivilDate(birthDate);
  if (!birth) {
    return { ok: false, message: "생년월일은 YYYY-MM-DD 날짜로 입력하세요." };
  }
  if (birth.year < 1900) {
    return { ok: false, message: "생년월일이 허용 범위를 벗어났습니다." };
  }
  let today = null;
  try {
    today = seoulToday();
  } catch {
    today = null;
  }
  if (today && !civilLte(birth, today)) {
    return { ok: false, message: "생년월일은 오늘 이전이어야 합니다." };
  }
  if (!SEX_VALUES.includes(sex)) {
    return { ok: false, message: "성별을 선택하세요." };
  }
  if (!LIFE_AREA_NAMES.includes(areaNm)) {
    return { ok: false, message: "지역을 선택하세요." };
  }
  return {
    ok: true,
    profile: { birthDate, sex, areaNm },
  };
}

function civilLte(a, b) {
  if (a.year !== b.year) {
    return a.year < b.year;
  }
  if (a.month !== b.month) {
    return a.month < b.month;
  }
  return a.day <= b.day;
}

function isIdleExpired(lastActiveAt, nowMs) {
  if (typeof lastActiveAt !== "number" || !Number.isFinite(lastActiveAt)) {
    return true;
  }
  return nowMs - lastActiveAt >= PROFILE_IDLE_MS;
}

/**
 * sessionStorage JSON을 읽는다. 만료·손상 시 지우고 null.
 */
export function readStoredProfile(storage, nowMs = Date.now()) {
  if (!storage) {
    return null;
  }
  let raw;
  try {
    raw = storage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearStoredProfile(storage);
    return null;
  }
  if (isIdleExpired(parsed.lastActiveAt, nowMs)) {
    clearStoredProfile(storage);
    return null;
  }
  let checked;
  try {
    checked = validateProfileFields({
      birthDate: parsed.birthDate,
      sex: parsed.sex,
      areaNm: parsed.areaNm,
    });
  } catch {
    clearStoredProfile(storage);
    return null;
  }
  if (!checked.ok) {
    clearStoredProfile(storage);
    return null;
  }
  return {
    ...checked.profile,
    lastActiveAt: parsed.lastActiveAt,
  };
}

/**
 * 프로필만 저장한다. 보험나이는 계산값이라 넣지 않는다.
 */
export function writeStoredProfile(storage, fields, nowMs = Date.now()) {
  const checked = validateProfileFields(fields);
  if (!checked.ok) {
    return { ok: false, message: checked.message };
  }
  const record = {
    birthDate: checked.profile.birthDate,
    sex: checked.profile.sex,
    areaNm: checked.profile.areaNm,
    lastActiveAt: nowMs,
  };
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    return { ok: false, message: "브라우저 세션에 저장하지 못했습니다." };
  }
  return { ok: true, profile: record };
}

export function touchStoredProfile(storage, nowMs = Date.now()) {
  const current = readStoredProfile(storage, nowMs);
  if (!current) {
    return null;
  }
  return writeStoredProfile(storage, current, nowMs).profile ?? null;
}

export function clearStoredProfile(storage) {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    /* 저장소를 쓰지 못하면 메모리 상태만 비운다. */
  }
}
