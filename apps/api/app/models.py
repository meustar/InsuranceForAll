import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import BYTEA, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class PublicSyncRun(Base):
    __tablename__ = "public_sync_runs"
    __table_args__ = (
        CheckConstraint("source IN ('medical', 'auto', 'life')", name="ck_public_sync_runs_source"),
        CheckConstraint("status IN ('success', 'failed')", name="ck_public_sync_runs_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    base_period: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    row_count: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(64))
    error_message_sanitized: Mapped[str | None] = mapped_column(Text)

    cache_heads: Mapped[list["PublicCacheHead"]] = relationship(back_populates="active_sync_run")
    medical_rates: Mapped[list["StatsMedicalRate"]] = relationship(back_populates="sync_run")
    auto_contracts: Mapped[list["StatsAutoContract"]] = relationship(back_populates="sync_run")
    life_join_status: Mapped[list["StatsLifeJoinStatus"]] = relationship(back_populates="sync_run")


class PublicCacheHead(Base):
    __tablename__ = "public_cache_heads"
    __table_args__ = (
        CheckConstraint("source IN ('medical', 'auto', 'life')", name="ck_public_cache_heads_source"),
    )

    source: Mapped[str] = mapped_column(String(16), primary_key=True)
    active_sync_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public_sync_runs.id"),
        nullable=False,
    )
    stale: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    active_sync_run: Mapped[PublicSyncRun] = relationship(back_populates="cache_heads")


class StatsMedicalRate(Base):
    __tablename__ = "stats_medical_rates"
    __table_args__ = (
        UniqueConstraint(
            "sync_run_id",
            "bas_dt",
            "cmpy_cd",
            "ptrn",
            "mog",
            "prd_nm",
            "age",
            name="uq_stats_medical_rates_natural",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    sync_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public_sync_runs.id"),
        nullable=False,
    )
    bas_dt: Mapped[date] = mapped_column(Date, nullable=False)
    cmpy_cd: Mapped[str | None] = mapped_column(String(50))
    cmpy_nm: Mapped[str | None] = mapped_column(String(200))
    ptrn: Mapped[str | None] = mapped_column(String(150))
    mog: Mapped[str | None] = mapped_column(String(100))
    prd_nm: Mapped[str | None] = mapped_column(String(600))
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    ml_ins_rt: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    fml_ins_rt: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    ofr_inst_nm: Mapped[str | None] = mapped_column(String(200))
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    sync_run: Mapped[PublicSyncRun] = relationship(back_populates="medical_rates")


class StatsAutoContract(Base):
    __tablename__ = "stats_auto_contracts"
    __table_args__ = (
        UniqueConstraint(
            "sync_run_id",
            "isu_cmpy_ofr_ym",
            "isu_itms_nm",
            "mog_clsf_nm",
            "sex_nm",
            "aggr",
            "atmb_plor_nm",
            "kncr_nm",
            name="uq_stats_auto_contracts_natural",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    sync_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public_sync_runs.id"),
        nullable=False,
    )
    isu_cmpy_ofr_ym: Mapped[str] = mapped_column(String(6), nullable=False)
    isu_itms_nm: Mapped[str] = mapped_column(String(32), nullable=False)
    mog_clsf_nm: Mapped[str | None] = mapped_column(String(64))
    sex_nm: Mapped[str] = mapped_column(String(8), nullable=False)
    aggr: Mapped[str] = mapped_column(String(32), nullable=False)
    atmb_plor_nm: Mapped[str | None] = mapped_column(String(16))
    kncr_nm: Mapped[str | None] = mapped_column(String(32))
    join_cnt: Mapped[int | None] = mapped_column(BigInteger)
    elps_inpm: Mapped[Decimal | None] = mapped_column(Numeric(20, 0))
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    sync_run: Mapped[PublicSyncRun] = relationship(back_populates="auto_contracts")


class StatsLifeJoinStatus(Base):
    __tablename__ = "stats_life_join_status"
    __table_args__ = (
        UniqueConstraint(
            "sync_run_id",
            "stts_accml_trgt_yr",
            "area_nm",
            "sex_nm",
            "rchn_aggr",
            "isu_kind_nm",
            name="uq_stats_life_join_status_natural",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    sync_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public_sync_runs.id"),
        nullable=False,
    )
    stts_accml_trgt_yr: Mapped[str] = mapped_column(String(4), nullable=False)
    area_nm: Mapped[str] = mapped_column(String(32), nullable=False)
    sex_nm: Mapped[str] = mapped_column(String(8), nullable=False)
    rchn_aggr: Mapped[str] = mapped_column(String(32), nullable=False)
    isu_kind_nm: Mapped[str] = mapped_column(String(32), nullable=False)
    join_cnt: Mapped[int | None] = mapped_column(BigInteger)
    join_rto: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    sync_run: Mapped[PublicSyncRun] = relationship(back_populates="life_join_status")


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"
    __table_args__ = (
        CheckConstraint(
            "octet_length(anon_session_key_hash) = 32",
            name="ck_uploaded_documents_session_hash_len",
        ),
        Index("ix_uploaded_documents_session_job", "anon_session_key_hash", "job_id"),
        Index("ix_uploaded_documents_expires_at", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    anon_session_key_hash: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    job_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    byte_size: Mapped[int | None] = mapped_column(Integer)
    page_count: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fail_code: Mapped[str | None] = mapped_column(String(64))

    masked_coverage: Mapped["MaskedCoverage | None"] = relationship(
        back_populates="document",
        uselist=False,
    )
    ai_reports: Mapped[list["AiReport"]] = relationship(back_populates="document")


class MaskedCoverage(Base):
    __tablename__ = "masked_coverages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("uploaded_documents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    coverage_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    preview_masked: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    document: Mapped[UploadedDocument] = relationship(back_populates="masked_coverage")


class AiReport(Base):
    __tablename__ = "ai_reports"
    __table_args__ = (
        CheckConstraint("scope IN ('health', 'auto', 'life')", name="ck_ai_reports_scope"),
        CheckConstraint(
            "octet_length(anon_session_key_hash) = 32",
            name="ck_ai_reports_session_hash_len",
        ),
        CheckConstraint(
            "octet_length(access_token_hash) = 32",
            name="ck_ai_reports_access_hash_len",
        ),
        Index("ix_ai_reports_expires_at", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    anon_session_key_hash: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("uploaded_documents.id", ondelete="SET NULL"),
    )
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    access_token_hash: Mapped[bytes] = mapped_column(BYTEA, nullable=False, unique=True)
    input_summary: Mapped[dict] = mapped_column(JSONB, nullable=False)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    is_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    document: Mapped[UploadedDocument | None] = relationship(back_populates="ai_reports")


class ConsultationRequest(Base):
    __tablename__ = "consultation_requests"
    __table_args__ = (
        CheckConstraint("consent_agreed", name="ck_consultation_requests_consent_agreed"),
        CheckConstraint(
            "contact_channel IN ('phone', 'email')",
            name="ck_consultation_requests_contact_channel",
        ),
        CheckConstraint(
            "anon_session_key_hash IS NULL OR octet_length(anon_session_key_hash) = 32",
            name="ck_consultation_requests_session_hash_len",
        ),
        Index("ix_consultation_requests_expires_at", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    consent_agreed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    consented_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consent_notice_version: Mapped[str] = mapped_column(String(32), nullable=False)
    contact_encrypted: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    contact_channel: Mapped[str] = mapped_column(String(16), nullable=False)
    purpose_note_encrypted: Mapped[bytes | None] = mapped_column(BYTEA)
    encryption_key_version: Mapped[str] = mapped_column(String(32), nullable=False)
    anon_session_key_hash: Mapped[bytes | None] = mapped_column(BYTEA)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
