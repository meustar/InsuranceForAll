/**
 * Asia/Seoul 이용일 기준 보험나이. 칩 표시용이며 sessionStorage에는 넣지 않는다.
 * 달력 월 연산만 쓰고 182일 환산은 쓰지 않는다.
 */

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function anniversaryInYear(birth, year) {
  if (birth.month === 2 && birth.day === 29 && daysInMonth(year, 2) < 29) {
    return { year, month: 2, day: 28 };
  }
  return { year, month: birth.month, day: birth.day };
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

/**
 * YYYY-MM-DD만 받는다. 잘못된 형식은 null.
 */
export function parseCivilDate(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

export function formatCivilDate(civil) {
  const month = String(civil.month).padStart(2, "0");
  const day = String(civil.day).padStart(2, "0");
  return `${civil.year}-${month}-${day}`;
}

/**
 * 브라우저 현재 시각을 Asia/Seoul 달력일로 본다.
 */
export function seoulToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return parseCivilDate(`${get("year")}-${get("month")}-${get("day")}`);
}

export function addCalendarMonths(value, months) {
  const monthIndex = value.month - 1 + months;
  const year = value.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12 + 1;
  const day = Math.min(value.day, daysInMonth(year, month));
  return { year, month, day };
}

function lastBirthdayOnOrBefore(birth, asOf) {
  const thisYear = anniversaryInYear(birth, asOf.year);
  if (civilLte(thisYear, asOf)) {
    return thisYear;
  }
  return anniversaryInYear(birth, asOf.year - 1);
}

function attainedAge(birth, asOf) {
  let years = asOf.year - birth.year;
  if (!civilLte(anniversaryInYear(birth, asOf.year), asOf)) {
    years -= 1;
  }
  return years;
}

/**
 * 상령일(마지막 생일+6개월 당일)부터 만나이+1.
 */
export function insuranceAge(birth, asOf) {
  if (!civilLte(birth, asOf)) {
    throw new Error("future_birth");
  }
  const years = attainedAge(birth, asOf);
  const sixMonths = addCalendarMonths(lastBirthdayOnOrBefore(birth, asOf), 6);
  if (civilLte(sixMonths, asOf)) {
    return years + 1;
  }
  return years;
}

/**
 * 칩용 보험나이. 미래 생일이면 표시하지 않는다.
 */
export function insuranceAgeFromIso(birthIso, asOf = seoulToday()) {
  const birth = parseCivilDate(birthIso);
  if (!birth || !asOf) {
    return null;
  }
  try {
    return insuranceAge(birth, asOf);
  } catch {
    return null;
  }
}
