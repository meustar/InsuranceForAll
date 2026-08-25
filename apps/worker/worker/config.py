from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    """Worker process settings. OpenAI/SMTP keys are not loaded here."""

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


@lru_cache
def get_settings() -> WorkerSettings:
    return WorkerSettings()
