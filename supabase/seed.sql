-- ============================================================
-- Seed: Akun Admin Default
-- Jalankan di Supabase SQL Editor SETELAH 001_initial_schema.sql
-- ============================================================

-- CATATAN:
-- Password admin default: admin123
-- Hash ini di-generate dengan bcrypt cost 12
-- Ganti password setelah login pertama!

-- Admin Utama
insert into public.users (
  user_id,
  nama,
  username,
  email,
  password_hash,
  pin_hash,
  role,
  status,
  created_at,
  updated_at
) values (
  'usr-admin-001',
  'Admin Parama',
  'admin',
  'admin@parama-dc.com',
  -- password: admin123 (bcrypt cost 12)
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VKVzqL0Ky',
  null,
  'ADMIN',
  'ACTIVE',
  now(),
  now()
)
on conflict (user_id) do nothing;

-- ============================================================
-- PENTING: Hash di atas adalah PLACEHOLDER.
-- Setelah deploy, generate hash yang benar dengan:
-- 
--   const bcrypt = require('bcryptjs');
--   const hash = bcrypt.hashSync('admin123', 12);
--   console.log(hash);
--
-- Atau gunakan script: npm run seed
-- ============================================================
