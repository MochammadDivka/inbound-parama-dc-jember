-- ============================================================
-- Supabase README — Setup Guide
-- ============================================================

Setup Supabase untuk Parama DC Jember - Inbound Issue Tracker.

## Langkah-langkah Setup

### 1. Buat Supabase Project

1. Buka https://supabase.com dan login / daftar
2. Klik **New Project**
3. Isi nama project: `parama-dc-jember` (atau sesuai keinginan)
4. Set database password yang kuat
5. Pilih region terdekat (Singapore untuk Indonesia)
6. Klik **Create new project**

### 2. Jalankan SQL Migration

1. Di dashboard Supabase, buka **SQL Editor**
2. Buka file `supabase/migrations/001_initial_schema.sql`
3. Copy-paste seluruh isinya ke SQL Editor
4. Klik **Run** (RLS akan disabled untuk semua tabel — kita pakai service_role)

### 3. Dapatkan API Keys

Di Supabase Dashboard → **Project Settings** → **API**:

- `Project URL` → isi ke `SUPABASE_URL` di `.env.local`
- `anon public` key → isi ke `SUPABASE_ANON_KEY` di `.env.local`
- `service_role` key (secret!) → isi ke `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`

Contoh `.env.local`:
```
SUPABASE_URL=https://abcdefghijklm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Seed Admin Account

Setelah mengisi env vars, jalankan:

```bash
npm run seed
```

Ini akan membuat akun admin default:
- **Email**: admin@parama-dc.com
- **Password**: admin123

> ⚠️ WAJIB ganti password setelah login pertama!

### 5. Jalankan Aplikasi

```bash
npm run dev
```

## Struktur Tabel

| Tabel | Deskripsi |
|-------|-----------|
| `users` | Data user (USER & ADMIN), pin_hash, password_hash |
| `issues` | Data issue inbound |
| `cz_records` | Data CZ (Customer Zone) |
| `activity_logs` | Log aktivitas semua user |

## Foto

Foto tetap disimpan di **Google Drive** menggunakan service account yang sudah dikonfigurasi.
Upload dilakukan langsung dari Next.js server tanpa melalui GAS lagi.

Konfigurasi yang diperlukan (sudah ada di `.env.local`):
- `GOOGLE_DRIVE_FOLDER_ID` — ID folder Google Drive tujuan
- `GOOGLE_SERVICE_ACCOUNT_JSON` — Service account JSON (base64 encoded)

## Migrasi dari GAS

Google Apps Script (GAS) sudah tidak digunakan lagi untuk database.
File `src/lib/gas-client.ts` dipertahankan sebagai stub (akan selalu return error).

Jika ada data di Google Sheets yang perlu dimigrasikan, buat script manual
menggunakan Supabase client untuk insert data lama ke tabel-tabel baru.
