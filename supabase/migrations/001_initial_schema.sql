-- ============================================================
-- Parama DC Jember — Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension (sudah aktif di Supabase by default)
-- create extension if not exists "uuid-ossp";

-- ─── Users ──────────────────────────────────────────────────────────────────

create table if not exists public.users (
  user_id     text primary key,              -- e.g. "usr-001"
  nama        text not null,
  username    text not null unique,
  email       text unique,
  pin_hash    text,                          -- bcrypt hash, nullable untuk ADMIN
  password_hash text,                        -- bcrypt hash, nullable untuk USER
  role        text not null check (role in ('USER', 'ADMIN')),
  status      text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_users_username on public.users (username);
create index if not exists idx_users_email    on public.users (email);
create index if not exists idx_users_role     on public.users (role);
create index if not exists idx_users_status   on public.users (status);

-- ─── Sequence helpers for human-readable IDs ────────────────────────────────

-- Issues counter (ISS-YYYY-NNNNN)
create sequence if not exists public.issue_seq start 1 increment 1;

-- CZ counter (CZ-YYYY-NNNNN)
create sequence if not exists public.cz_seq start 1 increment 1;

-- Logs counter
create sequence if not exists public.log_seq start 1 increment 1;

-- ─── Issues ─────────────────────────────────────────────────────────────────

create table if not exists public.issues (
  issue_id              text primary key,            -- ISS-YYYY-NNNNN
  hu                    text,
  do_number             text,
  sku                   text,
  nama_barang           text not null,
  batch                 text,
  qty_system_pcs        integer not null default 0,
  qty_fisik_pcs         integer not null default 0,
  selisih_pcs           integer not null default 0,
  remaining_selisih_pcs integer,
  merge_history         text,                        -- JSON string
  merge_count           integer default 0,
  kategori_issue        text not null check (kategori_issue in (
                          'Selisih Qty (Kurang)',
                          'Selisih Qty (Lebih)',
                          'Kerusakan Fisik',
                          'Label Rusak / Tidak Terbaca',
                          'HU Rusak',
                          'Item Salah Penempatan',
                          'Lainnya'
                        )),
  keterangan            text,
  photo_url             text,
  status                text not null default 'OPEN' check (status in (
                          'OPEN', 'WAITING_APPROVAL', 'SOLVED', 'CANCELLED'
                        )),
  storage_tujuan        text,
  solved_by             text,                        -- nama user
  solved_at             timestamptz,
  solved_by_name        text,
  cancelled_by          text,                        -- nama user
  cancelled_at          timestamptz,
  cancelled_by_name     text,
  req_solved_by         text,                        -- nama user
  req_solved_at         timestamptz,
  req_solved_reason     text,
  reject_reason         text,
  created_by            text not null,               -- nama user
  created_by_name       text,
  created_at            timestamptz not null default now(),
  updated_by            text,
  updated_by_name       text,
  updated_at            timestamptz not null default now(),
  input_source          text not null default 'WEB' check (input_source in ('WEB', 'MANUAL'))
);

create index if not exists idx_issues_status       on public.issues (status);
create index if not exists idx_issues_created_by   on public.issues (created_by);
create index if not exists idx_issues_created_at   on public.issues (created_at desc);
create index if not exists idx_issues_sku          on public.issues (sku);
create index if not exists idx_issues_hu           on public.issues (hu);
create index if not exists idx_issues_kategori     on public.issues (kategori_issue);

-- ─── CZ Records ─────────────────────────────────────────────────────────────

create table if not exists public.cz_records (
  cz_id                  text primary key,           -- CZ-YYYY-NNNNN
  hu                     text,
  do_number              text,
  sku                    text not null,
  nama_barang            text not null,
  batch                  text not null,
  qty_pcs                integer not null default 0,
  keterangan             text,
  status                 text not null default 'OPEN' check (status in ('OPEN', 'SOLVED')),
  storage_tujuan         text,
  catatan_penyelesaian   text,
  created_by             text not null,              -- nama user
  created_by_name        text,
  created_at             timestamptz not null default now(),
  solved_by              text,                       -- nama user
  solved_by_name         text,
  solved_at              timestamptz
);

create index if not exists idx_cz_status      on public.cz_records (status);
create index if not exists idx_cz_created_by  on public.cz_records (created_by);
create index if not exists idx_cz_created_at  on public.cz_records (created_at desc);
create index if not exists idx_cz_sku         on public.cz_records (sku);

-- ─── Activity Logs ──────────────────────────────────────────────────────────

create table if not exists public.activity_logs (
  log_id          text primary key,                  -- log-TIMESTAMP-RANDOM
  reference_id    text not null,
  reference_type  text not null check (reference_type in ('ISSUE', 'CZ', 'USER')),
  action          text not null,
  performed_by    text not null,                     -- nama user
  timestamp       timestamptz not null default now(),
  notes           text
);

create index if not exists idx_logs_reference_id   on public.activity_logs (reference_id);
create index if not exists idx_logs_reference_type on public.activity_logs (reference_type);
create index if not exists idx_logs_timestamp      on public.activity_logs (timestamp desc);
create index if not exists idx_logs_performed_by   on public.activity_logs (performed_by);

-- ─── Row Level Security (disabled — kita pakai service_role dari server) ─────

alter table public.users          disable row level security;
alter table public.issues         disable row level security;
alter table public.cz_records     disable row level security;
alter table public.activity_logs  disable row level security;

-- ─── Done ────────────────────────────────────────────────────────────────────
-- Jalankan seed.sql selanjutnya untuk membuat akun admin default.
