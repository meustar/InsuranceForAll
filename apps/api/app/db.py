def sync_database_url(async_url: str) -> str:
    """Alembic runs synchronously; Compose injects postgresql+asyncpg://."""
    if async_url.startswith("postgresql+asyncpg://"):
        return "postgresql+psycopg://" + async_url.removeprefix("postgresql+asyncpg://")
    if async_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + async_url.removeprefix("postgresql://")
    return async_url
