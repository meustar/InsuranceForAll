"""Celery worker 환경변수. OpenAI·SMTP 키는 로드하지 않는다."""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    """배치·브로커 설정. 공공 API 키와 DB/Redis만 두고 값은 로그하지 않는다."""

    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=None,
        case_sensitive=False,
    )

    app_env: str = "development"
    log_level: str = "INFO"
    celery_concurrency: int = 1

    document_result_retention_hours: int = 24

    database_url: SecretStr
    redis_url: SecretStr

    data_go_kr_medical_api_key: SecretStr
    data_go_kr_auto_api_key: SecretStr
    data_go_kr_life_api_key: SecretStr

    document_staging_dir: str = "/var/ifa/staging"


@lru_cache
def get_settings() -> WorkerSettings:
    """프로세스당 한 번 환경변수를 읽어 WorkerSettings를 캐시한다."""
    return WorkerSettings()
