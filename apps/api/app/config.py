"""API 프로세스 환경변수. worker 전용 키는 이 모델에 두지 않는다."""

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class ApiSettings(BaseSettings):
    """HTTP API가 읽는 설정. 필수 비밀은 기본값 없이 기동을 실패시키고 값은 로그하지 않는다."""

    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=None,
        case_sensitive=False,
    )

    app_env: str = "development"
    log_level: str = "INFO"

    document_result_retention_hours: int = 24
    ai_report_retention_days: int = 7
    consultation_retention_days: int = 30
    encryption_key_version: str = "v1"
    consultation_consent_notice_version: str = "2026-08-25"

    database_url: SecretStr
    redis_url: SecretStr

    openai_api_key: SecretStr
    openai_model: str = "gpt-5.6-luna"
    contact_encryption_key: SecretStr
    session_token_pepper: SecretStr
    report_token_pepper: SecretStr

    consultation_notify_email: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: SecretStr = Field(default=SecretStr(""))
    smtp_from: str = ""

    session_cookie_secure: bool = False
    document_staging_dir: str = "/var/ifa/staging"


@lru_cache
def get_settings() -> ApiSettings:
    """프로세스당 한 번 환경변수를 읽어 ApiSettings를 캐시한다."""
    return ApiSettings()
