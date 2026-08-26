"""이용일(Asia/Seoul) 기준 보험나이와 실손·자동차·생명 어댑터. 생년월일은 호출 측에서 버린다."""

from __future__ import annotations

import calendar
from datetime import date

AUTO_SAMPLE_INSUFFICIENT = "표본부족"


def add_calendar_months(value: date, months: int) -> date:
    """달력 월을 더하고 월말·윤년은 그 달의 마지막 날로 맞춘다."""
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _anniversary_in_year(birth: date, year: int) -> date:
    try:
        return birth.replace(year=year)
    except ValueError:
        return date(year, 2, 28)


def last_birthday_on_or_before(birth: date, as_of: date) -> date:
    """as_of 이전(당일 포함)의 가장 최근 생일. 2월 29일은 평년에 28일로 본다."""
    this_year = _anniversary_in_year(birth, as_of.year)
    if this_year <= as_of:
        return this_year
    return _anniversary_in_year(birth, as_of.year - 1)


def attained_age(birth: date, as_of: date) -> int:
    """as_of 기준 만나이. 생일이 아직이면 한 살을 빼다."""
    years = as_of.year - birth.year
    if as_of < _anniversary_in_year(birth, as_of.year):
        years -= 1
    return years


def insurance_age(birth: date, as_of: date) -> int:
    """상령일(마지막 생일+6개월 당일)부터 만나이+1. 182일 환산은 쓰지 않는다."""
    if birth > as_of:
        raise ValueError("future_birth")
    years = attained_age(birth, as_of)
    six_months = add_calendar_months(last_birthday_on_or_before(birth, as_of), 6)
    if as_of >= six_months:
        return years + 1
    return years


def age_band_auto(age: int) -> str:
    """자동차 캐시 aggr 문자열. 0–9세는 표본 부족 안내용 값이다."""
    if age < 10:
        return AUTO_SAMPLE_INSUFFICIENT
    if age < 30:
        return "20대 이하"
    if age < 40:
        return "30대"
    if age < 50:
        return "40대"
    if age < 60:
        return "50대"
    if age < 70:
        return "60대"
    return "70대 이상"


def age_band_life(age: int) -> str:
    """생명 캐시 rchn_aggr 문자열."""
    if age < 10:
        return "10세 미만"
    if age < 20:
        return "10대"
    if age < 30:
        return "20대"
    if age < 40:
        return "30대"
    if age < 50:
        return "40대"
    if age < 60:
        return "50대"
    if age < 70:
        return "60대"
    if age < 80:
        return "70대"
    return "80세 이상"
