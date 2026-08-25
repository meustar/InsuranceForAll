from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from app.models import Base

REQUIRED_TABLES = {
    "public_sync_runs",
    "public_cache_heads",
    "stats_medical_rates",
    "stats_auto_contracts",
    "stats_life_join_status",
    "uploaded_documents",
    "masked_coverages",
    "ai_reports",
    "consultation_requests",
}

FORBIDDEN_TABLES = {"session_profiles", "user_profiles", "profiles"}

FORBIDDEN_COLUMN_NAMES = {
    "birth_date",
    "birthdate",
    "date_of_birth",
    "insurance_age",
    "insuranceage",
    "original_filename",
    "access_token",
    "session_token",
}


def test_required_tables_exist_on_metadata() -> None:
    assert REQUIRED_TABLES <= set(Base.metadata.tables)


def test_no_session_profile_tables() -> None:
    tables = set(Base.metadata.tables)
    assert tables.isdisjoint(FORBIDDEN_TABLES)


def test_no_persisted_profile_or_raw_token_columns() -> None:
    for table in Base.metadata.tables.values():
        column_names = {column.name.lower() for column in table.columns}
        leaked = column_names & FORBIDDEN_COLUMN_NAMES
        assert not leaked, f"{table.name} has forbidden columns: {leaked}"


def test_ddl_sql_omits_profile_persistence() -> None:
    dialect = postgresql.dialect()
    rendered = "\n".join(
        str(CreateTable(table).compile(dialect=dialect)) for table in Base.metadata.sorted_tables
    ).lower()
    assert "session_profiles" not in rendered
    assert "birth_date" not in rendered
    assert "insurance_age" not in rendered


def test_sync_url_rewrite() -> None:
    from app.db import sync_database_url

    rewritten = sync_database_url(
        "postgresql+asyncpg://insurance_app:unused@localhost:5432/insurance_for_all"
    )
    assert rewritten.startswith("postgresql+psycopg://")
    assert "asyncpg" not in rewritten
