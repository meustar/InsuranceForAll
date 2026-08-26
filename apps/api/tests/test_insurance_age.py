from datetime import date

import pytest

from app.insurance_age import (
    AUTO_SAMPLE_INSUFFICIENT,
    age_band_auto,
    age_band_life,
    insurance_age,
)


def test_insurance_age_before_and_on_six_month_anniversary() -> None:
    birth = date(1990, 3, 15)
    assert insurance_age(birth, date(2026, 9, 14)) == 36
    assert insurance_age(birth, date(2026, 9, 15)) == 37


def test_insurance_age_month_end_and_leap_day() -> None:
    assert insurance_age(date(2020, 8, 31), date(2026, 2, 28)) == 6
    assert insurance_age(date(2000, 2, 29), date(2025, 2, 28)) == 25
    assert insurance_age(date(2000, 2, 29), date(2025, 8, 28)) == 26


def test_future_birth_rejected() -> None:
    with pytest.raises(ValueError):
        insurance_age(date(2030, 1, 1), date(2026, 8, 26))


def test_adapter_bands() -> None:
    assert age_band_auto(9) == AUTO_SAMPLE_INSUFFICIENT
    assert age_band_auto(19) == "20대 이하"
    assert age_band_auto(29) == "20대 이하"
    assert age_band_auto(40) == "40대"
    assert age_band_auto(80) == "70대 이상"
    assert age_band_life(9) == "10세 미만"
    assert age_band_life(15) == "10대"
    assert age_band_life(40) == "40대"
    assert age_band_life(80) == "80세 이상"
