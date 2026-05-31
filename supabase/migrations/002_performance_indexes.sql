-- ====================================================
-- MIGRATION: 002_performance_indexes.sql
-- Optimasi Performa Query & Aktifkan Supabase Realtime
-- ====================================================

-- 1. Index untuk tabel 'issues'
-- Filter status + sort tanggal terbalik (dashboard & list)
CREATE INDEX IF NOT EXISTS idx_issues_status_created ON issues(status, created_at DESC);

-- Filter pembuat + status (dashboard user)
CREATE INDEX IF NOT EXISTS idx_issues_created_by_status ON issues(created_by, status);

-- Full-text search sederhana untuk pencarian nama_barang
CREATE INDEX IF NOT EXISTS idx_issues_nama_barang ON issues USING gin(to_tsvector('simple', nama_barang));

-- 2. Index untuk tabel 'cz_records'
-- Filter status + sort tanggal terbalik (list CZ)
CREATE INDEX IF NOT EXISTS idx_cz_status_created ON cz_records(status, created_at DESC);

-- 3. Index untuk tabel 'activity_logs'
-- Sort activity feed teranyar (recent activity)
CREATE INDEX IF NOT EXISTS idx_logs_timestamp_desc ON activity_logs(timestamp DESC);


-- 4. Aktifkan Supabase Realtime Replication secara aman
-- Memastikan publikasi 'supabase_realtime' ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Menambahkan tabel ke publikasi 'supabase_realtime' secara aman (mengabaikan jika sudah ada)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE issues;
  EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'Table issues already in replication';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cz_records;
  EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'Table cz_records already in replication';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
  EXCEPTION WHEN duplicate_object THEN 
    RAISE NOTICE 'Table activity_logs already in replication';
  END;
END $$;
