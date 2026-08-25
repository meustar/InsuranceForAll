"""ERD v1.5 initial schema (no session_profiles).

Revision ID: erd_v15_initial
Revises:
Create Date: 2026-08-25
"""

from typing import Sequence, Union

from alembic import op

revision: str = "erd_v15_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UPGRADE_SQL = """
CREATE TABLE public_sync_runs (
  id            UUID PRIMARY KEY,
  source        VARCHAR(16) NOT NULL CHECK (source IN ('medical', 'auto', 'life')),
  base_period   VARCHAR(16) NOT NULL,
  status        VARCHAR(16) NOT NULL CHECK (status IN ('success', 'failed')),
  row_count     INT,
  started_at    TIMESTAMPTZ NOT NULL,
  finished_at   TIMESTAMPTZ,
  error_code              VARCHAR(64),
  error_message_sanitized TEXT
);

CREATE TABLE public_cache_heads (
  source              VARCHAR(16) PRIMARY KEY
                      CHECK (source IN ('medical', 'auto', 'life')),
  active_sync_run_id  UUID NOT NULL REFERENCES public_sync_runs(id),
  stale               BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stats_medical_rates (
  id           UUID PRIMARY KEY,
  sync_run_id  UUID NOT NULL REFERENCES public_sync_runs(id),
  bas_dt       DATE NOT NULL,
  cmpy_cd      VARCHAR(50),
  cmpy_nm      VARCHAR(200),
  ptrn         VARCHAR(150),
  mog          VARCHAR(100),
  prd_nm       VARCHAR(600),
  age          INT NOT NULL,
  ml_ins_rt    NUMERIC(18,2),
  fml_ins_rt   NUMERIC(18,2),
  ofr_inst_nm  VARCHAR(200),
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sync_run_id, bas_dt, cmpy_cd, ptrn, mog, prd_nm, age)
);

CREATE TABLE stats_auto_contracts (
  id                UUID PRIMARY KEY,
  sync_run_id       UUID NOT NULL REFERENCES public_sync_runs(id),
  isu_cmpy_ofr_ym   VARCHAR(6) NOT NULL,
  isu_itms_nm       VARCHAR(32) NOT NULL,
  mog_clsf_nm       VARCHAR(64),
  sex_nm            VARCHAR(8) NOT NULL,
  aggr              VARCHAR(32) NOT NULL,
  atmb_plor_nm      VARCHAR(16),
  kncr_nm           VARCHAR(32),
  join_cnt          BIGINT,
  elps_inpm         NUMERIC(20,0),
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sync_run_id, isu_cmpy_ofr_ym, isu_itms_nm, mog_clsf_nm,
          sex_nm, aggr, atmb_plor_nm, kncr_nm)
);

CREATE TABLE stats_life_join_status (
  id                   UUID PRIMARY KEY,
  sync_run_id          UUID NOT NULL REFERENCES public_sync_runs(id),
  stts_accml_trgt_yr   VARCHAR(4) NOT NULL,
  area_nm              VARCHAR(32) NOT NULL,
  sex_nm               VARCHAR(8) NOT NULL,
  rchn_aggr            VARCHAR(32) NOT NULL,
  isu_kind_nm          VARCHAR(32) NOT NULL,
  join_cnt             BIGINT,
  join_rto             NUMERIC(8,2),
  fetched_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sync_run_id, stts_accml_trgt_yr, area_nm, sex_nm, rchn_aggr, isu_kind_nm)
);

CREATE TABLE uploaded_documents (
  id                 UUID PRIMARY KEY,
  anon_session_key_hash BYTEA NOT NULL
                        CHECK (octet_length(anon_session_key_hash) = 32),
  job_id             VARCHAR(64) NOT NULL UNIQUE,
  status             VARCHAR(32) NOT NULL,
  byte_size          INT,
  page_count         INT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL,
  fail_code          VARCHAR(64)
);

CREATE TABLE masked_coverages (
  id               UUID PRIMARY KEY,
  document_id      UUID NOT NULL UNIQUE REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  coverage_json    JSONB NOT NULL,
  preview_masked   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_reports (
  id                UUID PRIMARY KEY,
  anon_session_key_hash BYTEA NOT NULL
                        CHECK (octet_length(anon_session_key_hash) = 32),
  document_id       UUID REFERENCES uploaded_documents(id) ON DELETE SET NULL,
  scope             VARCHAR(16) NOT NULL CHECK (scope IN ('health', 'auto', 'life')),
  access_token_hash BYTEA NOT NULL UNIQUE
                    CHECK (octet_length(access_token_hash) = 32),
  input_summary     JSONB NOT NULL,
  body_markdown     TEXT NOT NULL,
  is_fallback       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL
);

CREATE TABLE consultation_requests (
  id                  UUID PRIMARY KEY,
  consent_agreed      BOOLEAN NOT NULL CHECK (consent_agreed),
  consented_at        TIMESTAMPTZ NOT NULL,
  consent_notice_version VARCHAR(32) NOT NULL,
  contact_encrypted   BYTEA NOT NULL,
  contact_channel     VARCHAR(16) NOT NULL
                      CHECK (contact_channel IN ('phone', 'email')),
  purpose_note_encrypted BYTEA,
  encryption_key_version VARCHAR(32) NOT NULL,
  anon_session_key_hash BYTEA
                        CHECK (anon_session_key_hash IS NULL OR octet_length(anon_session_key_hash) = 32),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_uploaded_documents_session_job
  ON uploaded_documents (anon_session_key_hash, job_id);
CREATE INDEX ix_uploaded_documents_expires_at
  ON uploaded_documents (expires_at);
CREATE INDEX ix_ai_reports_expires_at
  ON ai_reports (expires_at);
CREATE INDEX ix_consultation_requests_expires_at
  ON consultation_requests (expires_at);
"""

DOWNGRADE_SQL = """
DROP TABLE IF EXISTS consultation_requests;
DROP TABLE IF EXISTS ai_reports;
DROP TABLE IF EXISTS masked_coverages;
DROP TABLE IF EXISTS uploaded_documents;
DROP TABLE IF EXISTS stats_life_join_status;
DROP TABLE IF EXISTS stats_auto_contracts;
DROP TABLE IF EXISTS stats_medical_rates;
DROP TABLE IF EXISTS public_cache_heads;
DROP TABLE IF EXISTS public_sync_runs;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
