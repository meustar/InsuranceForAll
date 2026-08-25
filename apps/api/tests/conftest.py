import os

# Dummy values only — not real keys. Must run before app import.
_PLACEHOLDER = "local-test-placeholder-not-a-secret"

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://insurance_app:unused@localhost:5432/insurance_for_all",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("OPENAI_API_KEY", _PLACEHOLDER)
os.environ.setdefault("CONTACT_ENCRYPTION_KEY", _PLACEHOLDER)
os.environ.setdefault("SESSION_TOKEN_PEPPER", _PLACEHOLDER)
os.environ.setdefault("REPORT_TOKEN_PEPPER", _PLACEHOLDER)
os.environ.setdefault("SMTP_PASSWORD", _PLACEHOLDER)
