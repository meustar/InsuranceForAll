"""동기 마이그레이션용 DB URL 변환."""


def sync_database_url(async_url: str) -> str:
    """Compose의 asyncpg URL을 Alembic이 쓰는 동기 드라이버 URL로 바꾼다."""
    if async_url.startswith("postgresql+asyncpg://"):
        return "postgresql+psycopg://" + async_url.removeprefix("postgresql+asyncpg://")
    if async_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + async_url.removeprefix("postgresql://")
    return async_url
