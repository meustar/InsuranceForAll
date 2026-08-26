"""API 요청용 async SQLAlchemy 세션. 요청 경로에서 공공 포털 클라이언트를 쓰지 않는다."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

_engine = None
_session_maker: async_sessionmaker[AsyncSession] | None = None


def get_engine():
    """설정이 준비된 뒤에만 엔진을 만들어 테스트 import가 DB에 붙지 않게 한다."""
    global _engine
    if _engine is None:
        url = get_settings().database_url.get_secret_value()
        _engine = create_async_engine(url, pool_pre_ping=True)
    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """요청마다 짧은 세션을 연다. 프로필 INSERT용 세션이 아니다."""
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _session_maker


async def get_db() -> AsyncIterator[AsyncSession]:
    """캐시 조회 트랜잭션을 열고 끝나면 닫는다."""
    async with get_session_maker()() as session:
        yield session
