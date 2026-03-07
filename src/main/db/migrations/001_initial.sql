-- Initial schema: all tables for BYOK AI Studio
-- Migration: 001_initial.sql

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  cover_image   TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  archived      INTEGER DEFAULT 0,
  tags          TEXT
);

-- Generation Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id),
  type            TEXT NOT NULL DEFAULT 'image',
  status          TEXT NOT NULL DEFAULT 'queued',
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  prompt_data     TEXT NOT NULL,
  raw_prompt      TEXT,
  parameters      TEXT,
  reference_ids   TEXT,
  result_assets   TEXT,
  cost_usd        REAL,
  tokens_used     INTEGER,
  api_request_id  TEXT,
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,
  fallback_chain  TEXT,
  created_at      INTEGER NOT NULL,
  started_at      INTEGER,
  completed_at    INTEGER,
  duration_ms     INTEGER
);

-- Assets (images, videos, references)
CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY,
  project_id    TEXT REFERENCES projects(id),
  job_id        TEXT REFERENCES jobs(id),
  type          TEXT NOT NULL DEFAULT 'image',
  file_path     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT,
  width         INTEGER,
  height        INTEGER,
  duration_ms   INTEGER,
  thumbnail     TEXT,
  metadata      TEXT,
  favorite      INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL,
  tags          TEXT
);

-- Provider Configurations
CREATE TABLE IF NOT EXISTS providers (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  api_key_ref     TEXT,
  enabled         INTEGER DEFAULT 1,
  models          TEXT NOT NULL DEFAULT '[]',
  rate_limit      TEXT,
  fallback_for    TEXT,
  config          TEXT,
  last_tested_at  INTEGER
);

-- Presets
CREATE TABLE IF NOT EXISTS presets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  prompt_data   TEXT NOT NULL,
  built_in      INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- Character / Element Library
CREATE TABLE IF NOT EXISTS library_items (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  thumbnail     TEXT,
  tags          TEXT,
  description   TEXT,
  usage_count   INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL
);

-- Cost Ledger
CREATE TABLE IF NOT EXISTS cost_entries (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES jobs(id),
  project_id    TEXT NOT NULL,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'image',
  cost_usd      REAL NOT NULL,
  created_at    INTEGER NOT NULL
);

-- App Settings (single row)
CREATE TABLE IF NOT EXISTS app_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  theme           TEXT DEFAULT 'dark',
  default_provider TEXT DEFAULT 'openai',
  default_model   TEXT DEFAULT 'dall-e-3',
  output_dir      TEXT,
  log_level       TEXT DEFAULT 'info',
  max_concurrent  INTEGER DEFAULT 2,
  confirm_cost_above REAL
);

INSERT OR IGNORE INTO app_settings (id) VALUES (1);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_job ON assets(job_id);
CREATE INDEX IF NOT EXISTS idx_costs_project ON cost_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_costs_provider ON cost_entries(provider);
CREATE INDEX IF NOT EXISTS idx_costs_date ON cost_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_presets_category ON presets(category);
CREATE INDEX IF NOT EXISTS idx_library_type ON library_items(type);
