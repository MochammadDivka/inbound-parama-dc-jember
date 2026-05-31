-- ====================================================
-- MIGRATION: 003_login_attempts_and_rls.sql
-- Membuat tabel login_attempts & Mengaktifkan RLS secara global
-- ====================================================

-- 1. Membuat tabel login_attempts persisten
CREATE TABLE IF NOT EXISTS public.login_attempts (
  username      text PRIMARY KEY,
  attempts      integer NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  last_attempt  timestamptz NOT NULL DEFAULT now()
);

-- Index Full-text search sederhana untuk pencarian cz_records.nama_barang
CREATE INDEX IF NOT EXISTS idx_cz_nama_barang ON cz_records USING gin(to_tsvector('simple', nama_barang));

-- 2. Mengaktifkan Row-Level Security (RLS) pada seluruh tabel operasional
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cz_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan SELECT (baca) hanya untuk user terautentikasi (NextAuth)
-- (Karena koneksi client-side/realtime di browser menggunakan anon key yang membutuhkan SELECT terautentikasi)
-- (Sedangkan server-side API menggunakan service_role key yang otomatis membypass RLS untuk insert/update/delete)
DO $$
BEGIN
  -- Kebijakan baca tabel 'users'
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow authenticated read users'
  ) THEN
    CREATE POLICY "Allow authenticated read users" ON public.users FOR SELECT TO authenticated USING (true);
  END IF;

  -- Kebijakan baca tabel 'issues'
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'issues' AND policyname = 'Allow authenticated read issues'
  ) THEN
    CREATE POLICY "Allow authenticated read issues" ON public.issues FOR SELECT TO authenticated USING (true);
  END IF;

  -- Kebijakan baca tabel 'cz_records'
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cz_records' AND policyname = 'Allow authenticated read cz'
  ) THEN
    CREATE POLICY "Allow authenticated read cz" ON public.cz_records FOR SELECT TO authenticated USING (true);
  END IF;

  -- Kebijakan baca tabel 'activity_logs'
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Allow authenticated read logs'
  ) THEN
    CREATE POLICY "Allow authenticated read logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
  END IF;

  -- Kebijakan baca tabel 'login_attempts'
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'login_attempts' AND policyname = 'Allow authenticated read attempts'
  ) THEN
    CREATE POLICY "Allow authenticated read attempts" ON public.login_attempts FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
