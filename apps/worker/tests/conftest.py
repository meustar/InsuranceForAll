import os

_PLACEHOLDER = "local-test-placeholder-not-a-secret"

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://insurance_app:unused@localhost:5432/insurance_for_all",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("DATA_GO_KR_MEDICAL_API_KEY", _PLACEHOLDER)
os.environ.setdefault("DATA_GO_KR_AUTO_API_KEY", _PLACEHOLDER)
os.environ.setdefault("DATA_GO_KR_LIFE_API_KEY", _PLACEHOLDER)
os.environ.setdefault("CELERY_CONCURRENCY", "1")
