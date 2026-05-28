# Google Apps Script (GAS) — Setup Guide

## Overview

File `Code.gs` adalah backend layer yang berjalan di Google Apps Script dan membaca/menulis ke Google Sheets sebagai database. Next.js berkomunikasi dengan GAS melalui HTTP API.

---

## Langkah 1: Setup Google Sheets

Buat Google Sheets baru dengan **4 sheet** (tab) berikut:

### Sheet 1: `USERS`
Header row (baris pertama):
```
user_id | nama | username | email | pin_hash | password_hash | role | status | created_at | updated_at
```
- `email` — wajib diisi untuk ADMIN dan SPV (untuk login email+password)
- `pin_hash` — bcrypt hash dari PIN 6 digit (wajib untuk USER, opsional untuk ADMIN/SPV)
- `password_hash` — bcrypt hash dari password (wajib untuk ADMIN dan SPV)

### Sheet 2: `ISSUES`
Header row:
```
issue_id | hu | do_number | sku | nama_barang | batch | qty_system_pcs | qty_fisik_pcs | selisih_pcs | kategori_issue | keterangan | photo_url | status | storage_tujuan | solved_by | solved_at | cancelled_by | cancelled_at | created_by | created_at | updated_by | updated_at | input_source
```

### Sheet 3: `CZ`
Header row:
```
cz_id | hu | do_number | sku | nama_barang | batch | qty_pcs | keterangan | status | storage_tujuan | catatan_penyelesaian | created_by | created_at | solved_by | solved_at
```

### Sheet 4: `LOGS`
Header row:
```
log_id | reference_id | reference_type | action | performed_by | timestamp | notes
```

---

## Langkah 2: Setup Admin User Pertama

Di Sheet `USERS`, tambahkan baris untuk admin:

| Kolom | Value |
|-------|-------|
| `user_id` | UUID (generate di https://www.uuidgenerator.net) |
| `nama` | Nama Admin |
| `username` | admin |
| `email` | admin@perusahaan.com |
| `pin_hash` | *(kosongkan)* |
| `password_hash` | Hash bcrypt dari password admin (gunakan https://bcrypt.online/ dengan cost 12) |
| `role` | ADMIN |
| `status` | ACTIVE |
| `created_at` | Waktu sekarang dalam ISO 8601 (contoh: `2026-01-01T00:00:00Z`) |
| `updated_at` | Sama dengan created_at |

> Untuk USER biasa: isi `pin_hash` (bcrypt dari PIN 6 digit), kosongkan `email` dan `password_hash`.

---

## Langkah 3: Deploy Google Apps Script

1. Buka Google Sheets → **Extensions** → **Apps Script**
2. Hapus kode default, paste isi `Code.gs`
3. Klik **Deploy** → **New Deployment**
4. Pilih type: **Web App**
5. Settings:
   - Description: `IITS Backend v1.0`
   - Execute as: **Me**
   - Who has access: **Anyone** (Next.js yang akan memvalidasi secret key)
6. Klik **Deploy** → izinkan akses → copy **Deployment URL**

---

## Langkah 4: Setup Script Properties

Di GAS Editor:
1. Klik **Project Settings** (ikon gear)
2. Scroll ke **Script Properties**
3. Tambahkan:

| Property | Value |
|----------|-------|
| `SPREADSHEET_ID` | ID Spreadsheet dari URL: `https://docs.google.com/spreadsheets/d/[ID_INI]/edit` |
| `SECRET_KEY` | String acak minimal 32 karakter (buat sendiri, contoh: `iits-gas-secret-key-2026-random-xyz`) |

---

## Langkah 5: Update Environment Variables

Di file `.env.local` proyek Next.js:
```env
# Google Apps Script
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec
GAS_SECRET_KEY=iits-gas-secret-key-2026-random-xyz
GOOGLE_SHEETS_ID=[SPREADSHEET_ID]

# Google Drive (untuk upload foto)
GOOGLE_DRIVE_FOLDER_ID=[ID_FOLDER_DRIVE]
GOOGLE_SERVICE_ACCOUNT_JSON=[BASE64_JSON]
```

### Cara generate GOOGLE_SERVICE_ACCOUNT_JSON:

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat atau pilih project
3. Aktifkan **Google Drive API**
4. Buat **Service Account**: IAM & Admin → Service Accounts → Create
5. Download JSON key dari service account
6. Encode ke base64 (di Linux/Mac): `base64 -w0 service-account.json`
7. Paste hasil encode ke `GOOGLE_SERVICE_ACCOUNT_JSON`
8. Share folder Google Drive ke email service account (dengan role **Editor**)

---

## Langkah 6: Test GAS Endpoint

Test manual dengan curl atau browser:

```bash
# Test get issues
curl "https://script.google.com/macros/s/[ID]/exec?action=getIssues&secret=[SECRET_KEY]"

# Test create issue (POST)
curl -X POST "https://script.google.com/macros/s/[ID]/exec?secret=[SECRET_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"action":"createIssue","sku":"SKU-001","nama_barang":"Test","batch":"B1","qty_system_pcs":10,"qty_fisik_pcs":9,"kategori_issue":"Selisih Qty (Kurang)","created_by":"usr-001"}'
```

---

## Langkah 7: Aktifkan GAS di Next.js

Saat `GOOGLE_APPS_SCRIPT_URL` sudah diisi di `.env.local`, `gas-client.ts` otomatis beralih dari mock data ke GAS.

---

## Catatan Penting

- GAS Web App URL **tidak berubah** setelah pertama deploy, kecuali di-undeploy
- Setiap update `Code.gs` perlu **New Deployment** baru (atau **Manage Deployments** → Edit versi existing)
- Eksekusi GAS maksimal **6 menit** per request (lebih dari cukup untuk operasi normal)
- GAS gratis untuk penggunaan internal, limit: 6 jam/hari compute time
- Google Sheets limit: 10 juta sel per spreadsheet

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Script function not found` | Pastikan `doGet` / `doPost` terdefinisi |
| `Authorization required` | Redeploy dengan akses "Anyone" |
| `Sheet tidak ditemukan` | Pastikan nama sheet PERSIS sama (case-sensitive) |
| Response lambat | GAS cold start ~2-5 detik, normal untuk request pertama |
| CORS error | Next.js API routes sudah bertindak sebagai proxy, tidak ada CORS issue |
