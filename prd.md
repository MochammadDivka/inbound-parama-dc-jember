# PRD — Inbound Issue Tracking System (MVP)
**Version:** 1.0.0  
**Last Updated:** Mei 2026  
**Status:** Ready for Development  
**Owner:** Warehouse Operations Team

---

## Daftar Isi

1. [Project Overview](#1-project-overview)
2. [Background Problem](#2-background-problem)
3. [MVP Scope](#3-mvp-scope)
4. [System Architecture](#4-system-architecture)
5. [Tech Stack](#5-tech-stack)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Authentication Flow](#7-authentication-flow)
8. [User Management](#8-user-management)
9. [Issue Management](#9-issue-management)
10. [Clarification Zone (CZ)](#10-clarification-zone-cz)
11. [Quantity Rules](#11-quantity-rules)
12. [Duplicate Detection](#12-duplicate-detection)
13. [Photo Evidence](#13-photo-evidence)
14. [Database Design](#14-database-design)
15. [Dashboard Specification](#15-dashboard-specification)
16. [UI/UX Design System](#16-uiux-design-system)
17. [Mobile UX — User Interface](#17-mobile-ux--user-interface-spesifikasi-detail)
18. [Desktop & Mobile UX — Admin/SPV Interface](#18-desktop--mobile-ux--adminspv-interface-spesifikasi-detail)
19. [API Specification](#19-api-specification)
20. [Security Rules](#20-security-rules)
21. [Data Integrity Rules](#21-data-integrity-rules)
22. [Print & Export Rules](#22-print--export-rules)
23. [Fallback Operational Strategy](#23-fallback-operational-strategy)
24. [Development Roadmap](#24-development-roadmap)
25. [Error Handling & Edge Cases](#25-error-handling--edge-cases)
26. [Success Criteria](#26-success-criteria)

---

## 1. Project Overview

### Project Name
**Inbound Issue Tracking System (IITS)**

### Project Type
Internal warehouse operational web application — mobile-first untuk USER, responsive desktop untuk ADMIN/SPV.

### Main Purpose
Membantu tim inbound warehouse mencatat, memonitor, dan menyelesaikan issue inbound secara digital agar:
- Mengurangi pencatatan manual dan coretan
- Mempermudah tracking issue secara real-time
- Mengurangi double input dan duplikasi data
- Mempermudah monitoring supervisor dari mana saja
- Menjaga histori operasional tetap rapi dan akuntabel

### Target Users
| Role | Jumlah Estimasi | Device Utama |
|------|----------------|--------------|
| Inbound Staff (USER) | 10–30 orang | Smartphone (Android/iOS) |
| Supervisor/Admin (SPV) | 2–5 orang | Desktop + Smartphone |
| Developer/IT | 1–2 orang | Desktop |

---

## 2. Background Problem

### Kondisi Saat Ini
Proses pencatatan issue inbound masih menggunakan:
- Catatan tulis manual di kertas atau buku
- Koreksi coretan yang sulit dibaca
- Tracking yang tidak terstruktur

### Masalah Utama
| Masalah | Dampak Operasional |
|---------|-------------------|
| Issue kurang/lebih sulit dilacak | Potensi kerugian stok |
| Double input terjadi | Data tidak akurat |
| Histori perubahan tidak jelas | Sulit audit dan accountability |
| Supervisor sulit monitoring | Respons lambat |
| Issue lama sulit dicari | Waktu terbuang |
| Data tidak real-time | Keputusan berdasarkan data lama |

---

## 3. MVP Scope

### ✅ Included in MVP

#### Authentication
- Login USER: username + PIN (6 digit)
- Login ADMIN/SPV: email + password
- Session management (persistent hingga logout)
- Logout dengan konfirmasi

#### User Management
- Tambah user baru (ADMIN only)
- Reset PIN user (ADMIN only)
- Deactivate / reactivate user (ADMIN only)
- Role assignment: USER / ADMIN / SPV

#### Issue Management
- Create issue (form input)
- Edit issue (USER: hanya milik sendiri + status OPEN; ADMIN: semua)
- View issue detail
- Resolve issue → status SOLVED (ADMIN/SPV only)
- Cancel issue → status CANCELLED (ADMIN/SPV only)
- Duplicate warning sebelum submit
- Upload foto sebagai bukti (optional, max 3 foto)

#### Clarification Zone (CZ)
- Create CZ record
- View CZ list
- Solve CZ (ADMIN/SPV only)
- Duplicate prevention per SKU + Batch + OPEN

#### Dashboard
- Summary cards (OPEN / SOLVED / CANCELLED / Today)
- Issue table dengan search & filter
- Recent activity log
- Export/print

#### Reporting
- Print report (browser print)
- Export PDF
- Export Excel (.xlsx)

---

### ❌ Excluded from MVP (Future Features)
- SAP integration
- Push notification
- Barcode scanning otomatis
- Multi-warehouse support
- Advanced approval workflow
- Analytics dashboard (chart/grafik lanjutan)
- Packaging conversion otomatis
- Realtime collaboration (WebSocket)

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENT LAYER                  │
│                                                 │
│  📱 Mobile Browser        🖥️ Desktop Browser    │
│  (USER - Staff)           (ADMIN/SPV)           │
└────────────────┬───────────────────────────────┘
                 │ HTTPS
┌────────────────▼───────────────────────────────┐
│               NEXT.JS APP (Vercel)              │
│                                                 │
│  /pages        /api routes       /components    │
│  - /login      - /api/auth       - UI Kit       │
│  - /dashboard  - /api/issues     - Forms        │
│  - /issues     - /api/users      - Tables       │
│  - /cz         - /api/cz         - Cards        │
│  - /admin      - /api/export                   │
└────────────────┬───────────────────────────────┘
                 │ HTTPS (Service Account)
┌────────────────▼───────────────────────────────┐
│           GOOGLE APPS SCRIPT (GAS)              │
│         (Web App - deployed as API)             │
│                                                 │
│  doGet() / doPost()                             │
│  - CRUD operations                              │
│  - Business logic validation                    │
│  - Spreadsheet read/write                       │
└────────────────┬───────────────────────────────┘
                 │ Sheets API
┌────────────────▼───────────────────────────────┐
│            GOOGLE SHEETS (Database)             │
│                                                 │
│  Sheet: USERS  │  ISSUES  │  CZ  │  LOGS       │
└────────────────┬───────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────┐
│           GOOGLE DRIVE (Storage)                │
│           Photo Evidence Files                  │
└─────────────────────────────────────────────────┘
```

### Data Flow
1. User input di browser → Next.js frontend
2. Next.js API Route → validasi + call GAS endpoint
3. GAS → baca/tulis Google Sheets
4. Response → Next.js → render ke browser

---

## 5. Tech Stack

### Frontend
| Technology | Version | Kegunaan |
|------------|---------|---------|
| Next.js | 14+ (App Router) | Framework utama |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3+ | Styling utility-first |
| React Hook Form | latest | Form management |
| Zod | latest | Schema validation |
| SWR atau React Query | latest | Data fetching & caching |
| next-auth | latest | Session management |

### Backend
| Technology | Kegunaan |
|------------|---------|
| Next.js API Routes | Backend API layer |
| Google Apps Script | Database operations layer |
| Google Sheets API | Data storage |
| Google Drive API | File/photo storage |

### Library Pendukung
| Library | Kegunaan |
|---------|---------|
| xlsx (SheetJS) | Export Excel |
| jsPDF | Export PDF |
| bcryptjs | PIN hashing |
| date-fns | Date formatting |
| lucide-react | Icon set |

### Deployment
| Service | Kegunaan |
|---------|---------|
| Vercel | Hosting Next.js |
| GitHub | Version control |
| Google Workspace | Sheets + Drive + GAS |

---

## 6. User Roles & Permissions

### Permission Matrix

| Feature | USER | SPV | ADMIN |
|---------|------|-----|-------|
| Login | ✅ | ✅ | ✅ |
| Lihat issue sendiri | ✅ | ✅ | ✅ |
| Lihat semua issue | ❌ | ✅ | ✅ |
| Buat issue | ✅ | ✅ | ✅ |
| Edit issue sendiri (OPEN) | ✅ | ✅ | ✅ |
| Edit issue orang lain | ❌ | ✅ | ✅ |
| Edit issue SOLVED | ❌ | ✅ | ✅ |
| Solve issue | ❌ | ✅ | ✅ |
| Cancel issue | ❌ | ✅ | ✅ |
| Upload foto | ✅ | ✅ | ✅ |
| Buat CZ record | ✅ | ✅ | ✅ |
| Solve CZ | ❌ | ✅ | ✅ |
| Kelola user | ❌ | ❌ | ✅ |
| Reset PIN user | ❌ | ❌ | ✅ |
| Export PDF/Excel | ❌ | ✅ | ✅ |
| Print report | ❌ | ✅ | ✅ |
| Lihat dashboard admin | ❌ | ✅ | ✅ |
| Monitoring activity log | ❌ | ✅ | ✅ |

---

## 7. Authentication Flow

### 7.1 USER Login (PIN-based)

```
[Halaman Login USER]
        │
        ▼
Input Username → Validasi username exist + status ACTIVE
        │
        ▼
Input PIN (6 digit, masked) → Hash PIN → Bandingkan dengan DB
        │
   ┌────┴────┐
   │ Gagal   │ Berhasil
   ▼         ▼
Tampil    Buat session token
error     → Redirect ke /dashboard (USER view)
(max 5x   
attempt,
lock 15 min)
```

**Aturan PIN:**
- 6 digit angka
- Disimpan sebagai bcrypt hash
- Tampil sebagai `••••••` saat input
- Tidak ada "lupa PIN" self-service → hubungi ADMIN

### 7.2 ADMIN/SPV Login (Email + Password)

```
[Halaman Login ADMIN — /admin/login]
        │
        ▼
Input Email → Validasi format email
        │
        ▼
Input Password → Validasi di DB
        │
   ┌────┴────┐
   │ Gagal   │ Berhasil
   ▼         ▼
Tampil    Buat session (role-aware)
error     → Redirect ke /admin/dashboard
```

**Aturan Password ADMIN:**
- Minimal 8 karakter
- Tidak ada self-register
- ADMIN dibuat langsung di spreadsheet atau oleh developer

### 7.3 Session Management
- Session disimpan via `next-auth` (JWT atau database session)
- Durasi session: 8 jam (satu shift kerja)
- Session expired → redirect ke halaman login
- Role disimpan dalam session payload
- Setiap API route mengecek role dari session

### 7.4 Logout
- Klik tombol logout → konfirmasi dialog → session dihapus → redirect ke `/login`
- Tidak ada auto-save draft saat logout

---

## 8. User Management

### 8.1 Tambah User Baru (ADMIN only)

**Required Fields:**
| Field | Type | Validasi |
|-------|------|---------|
| Nama Lengkap | Text | Wajib, max 100 char |
| Username | Text | Wajib, unik, lowercase, no spasi, max 30 char |
| PIN | Number | Wajib, 6 digit |
| Role | Dropdown | USER / SPV / ADMIN |

**Proses:**
1. ADMIN isi form tambah user
2. System cek username sudah ada?
3. Jika ya → error "Username sudah digunakan"
4. Jika tidak → simpan ke Sheet USERS (PIN di-hash dulu)
5. Log aktivitas: `user_created` oleh ADMIN

### 8.2 Reset PIN

1. ADMIN pilih user dari list
2. Klik "Reset PIN"
3. Input PIN baru (6 digit)
4. Konfirmasi PIN baru
5. Simpan hash PIN baru
6. Log aktivitas: `pin_reset` oleh ADMIN

### 8.3 Deactivate / Reactivate User

- ADMIN toggle status user: ACTIVE ↔ INACTIVE
- User INACTIVE tidak bisa login
- Data histori tetap tersimpan dan terhubung ke username
- Tidak ada hard delete

### 8.4 User Status

| Status | Deskripsi |
|--------|---------|
| ACTIVE | User bisa login normal |
| INACTIVE | User tidak bisa login, data tetap ada |

---

## 9. Issue Management

### 9.1 Issue Lifecycle

```
           [USER membuat issue]
                   │
                   ▼
               STATUS: OPEN
                   │
         ┌─────────┼──────────┐
         │                   │
         ▼                   ▼
   ADMIN/SPV           ADMIN/SPV
   SOLVE issue         CANCEL issue
         │                   │
         ▼                   ▼
   STATUS: SOLVED      STATUS: CANCELLED
         │                   │
         └─────────┬──────────┘
                   │
                   ▼
         [Issue terkunci - tidak bisa diedit]
```

### 9.2 Issue Status

| Status | Deskripsi | Siapa bisa ubah |
|--------|---------|----------------|
| OPEN | Issue aktif, belum selesai | Dibuat otomatis saat create |
| SOLVED | Issue terselesaikan | ADMIN/SPV only |
| CANCELLED | Issue dibatalkan | ADMIN/SPV only |

### 9.3 Create Issue — Form Fields

| Field | Type | Wajib | Keterangan |
|-------|------|-------|-----------|
| HU (Handling Unit) | Text | Opsional | Scan atau ketik manual |
| DO (Delivery Order) | Text | Opsional | Nomor DO dari SAP |
| SKU | Text | **Wajib** | Kode produk |
| Nama Barang | Text | **Wajib** | Nama produk |
| Batch | Text | Opsional | Nomor batch/lot |
| Qty System (PCS) | Number | **Wajib** | Qty menurut sistem |
| Qty Fisik (PCS) | Number | **Wajib** | Qty aktual di lapangan |
| Selisih PCS | Number | Auto | Dihitung otomatis: Fisik - System |
| Kategori Issue | Dropdown | **Wajib** | Lihat daftar kategori |
| Keterangan | Textarea | Opsional | Deskripsi tambahan |
| Foto Bukti | File Upload | Opsional | Max 3 foto, max 5MB/foto |
| Storage Tujuan | Text | Opsional | Jika item perlu dipindahkan |

**Kategori Issue (Dropdown):**
- Selisih Qty (Kurang)
- Selisih Qty (Lebih)
- Kerusakan Fisik
- Label Rusak / Tidak Terbaca
- HU Rusak
- Item Salah Penempatan
- Lainnya

### 9.4 Edit Issue

**USER dapat edit jika:**
- Issue milik sendiri (created_by = user login)
- Status = OPEN

**ADMIN/SPV dapat edit:**
- Semua issue
- Semua status (termasuk SOLVED — dengan catatan di log)

**Setiap edit → log otomatis** dengan field yang berubah.

### 9.5 Selisih Auto-Calculation

```
Saat user input Qty System dan Qty Fisik:
→ Selisih PCS = Qty Fisik - Qty System
→ Ditampilkan real-time di form (tidak perlu submit dulu)
→ Warna merah jika minus, hijau jika plus
```

---

## 10. Clarification Zone (CZ)

### 10.1 Tujuan
Mencatat item inbound yang diminta SAP untuk dipindahkan ke area Clarification Zone agar tidak hilang dan dapat dimonitor hingga selesai.

### 10.2 CZ Lifecycle

```
[Inbound process → SAP minta item ke CZ]
              │
              ▼
    USER buat CZ Record → Status: OPEN
              │
              ▼
    ADMIN/SPV follow up & selesaikan
              │
              ▼
    ADMIN/SPV ubah status → SOLVED
    (isi: Storage Tujuan + catatan)
```

### 10.3 CZ Form Fields

| Field | Type | Wajib | Keterangan |
|-------|------|-------|-----------|
| CZ ID | Auto | — | Generate otomatis |
| HU | Text | Opsional | — |
| DO | Text | Opsional | — |
| SKU | Text | **Wajib** | Untuk duplicate check |
| Nama Barang | Text | **Wajib** | — |
| Batch | Text | **Wajib** | Untuk duplicate check |
| Qty PCS | Number | **Wajib** | — |
| Keterangan | Textarea | Opsional | — |
| Status | Auto | — | Default: OPEN |
| Storage Tujuan | Text | Opsional (diisi saat SOLVED) | — |

### 10.4 CZ Duplicate Prevention

Jika sudah ada record CZ dengan:
- SKU yang sama
- Batch yang sama
- Status = OPEN

→ System **menolak** pembuatan record baru dan tampilkan warning + link ke record yang sudah ada.

### 10.5 CZ Solve (ADMIN/SPV only)

1. Buka CZ record
2. Klik "Selesaikan"
3. Isi Storage Tujuan (wajib saat solve)
4. Isi catatan penyelesaian (opsional)
5. Konfirmasi
6. Status berubah ke SOLVED, record terkunci

---

## 11. Quantity Rules

### Base Unit: PCS
Semua qty disimpan dalam satuan **PCS** saja.

**Alasan:**
- Logika paling sederhana
- Kalkulasi paling stabil
- Menghindari kompleksitas konversi satuan

### Kalkulasi Selisih

```
Selisih PCS = Qty Fisik PCS - Qty System PCS
```

| Contoh | Qty System | Qty Fisik | Selisih | Keterangan |
|--------|-----------|-----------|---------|-----------|
| Kurang | 100 | 98 | **-2** | Item fisik kurang dari sistem |
| Lebih | 100 | 120 | **+20** | Item fisik lebih dari sistem |
| Sama | 100 | 100 | **0** | Tidak ada selisih |

### Validasi Qty
- Qty System dan Qty Fisik tidak boleh negatif
- Qty minimal 0
- Selisih 0 tetap diperbolehkan (issue bisa kategori lain seperti kerusakan)

---

## 12. Duplicate Detection

### Aturan Cek Duplikat — Issue

System mengecek duplikat berdasarkan:
- SKU sama
- Batch sama
- Status = OPEN

Jika kondisi terpenuhi → **tolak input** + tampilkan peringatan dengan link ke issue yang sudah ada.

### Aturan Cek Duplikat — CZ

Sama seperti issue:
- SKU sama
- Batch sama
- Status = OPEN

### Timing Pengecekan
- Dilakukan **sebelum form submit** (onBlur dari field Batch)
- Juga dilakukan di server (API) sebagai double validation

### UI Duplicate Warning

```
┌─────────────────────────────────────────┐
│  ⚠️  Duplikat Terdeteksi               │
│                                         │
│  Issue dengan SKU [SKU-001] dan         │
│  Batch [BATCH-123] sudah ada.           │
│                                         │
│  [Lihat Issue #ISS-2024-001] [Tutup]    │
└─────────────────────────────────────────┘
```

---

## 13. Photo Evidence

### Aturan Upload Foto
| Aturan | Detail |
|--------|--------|
| Wajib? | Tidak (opsional) |
| Jumlah maks | 3 foto per issue |
| Ukuran maks per foto | 5 MB |
| Format yang diterima | JPG, JPEG, PNG, WEBP |
| Penyimpanan | Google Drive (folder terstruktur per bulan) |
| Referensi di DB | URL Google Drive disimpan di kolom `photo_url` (comma-separated) |
| Tampil di print? | Tidak |
| Tampil di app? | Ya, thumbnail kecil di detail issue |

### Struktur Folder Google Drive
```
/IITS-Photos/
  /2026/
    /01-Januari/
      ISS-2026-001-foto1.jpg
      ISS-2026-001-foto2.jpg
    /02-Februari/
      ...
```

---

## 14. Database Design

### Sheet 1 — USERS

| Kolom | Type | Keterangan |
|-------|------|-----------|
| user_id | String | UUID, auto-generate |
| nama | String | Nama lengkap |
| username | String | Unique, lowercase |
| pin_hash | String | Bcrypt hash dari PIN |
| role | Enum | USER / SPV / ADMIN |
| status | Enum | ACTIVE / INACTIVE |
| created_at | DateTime | ISO 8601 |
| updated_at | DateTime | ISO 8601 |

---

### Sheet 2 — ISSUES

| Kolom | Type | Keterangan |
|-------|------|-----------|
| issue_id | String | Format: ISS-YYYY-XXXXX |
| hu | String | Handling Unit |
| do_number | String | Delivery Order |
| sku | String | Kode SKU |
| nama_barang | String | Nama produk |
| batch | String | Nomor batch |
| qty_system_pcs | Number | Qty dari sistem |
| qty_fisik_pcs | Number | Qty fisik aktual |
| selisih_pcs | Number | Auto: fisik - system |
| kategori_issue | String | Enum kategori |
| keterangan | String | Deskripsi bebas |
| photo_url | String | URL(s), comma-separated |
| status | Enum | OPEN / SOLVED / CANCELLED |
| storage_tujuan | String | Lokasi tujuan |
| solved_by | String | user_id yang solve |
| solved_at | DateTime | Waktu solve |
| cancelled_by | String | user_id yang cancel |
| cancelled_at | DateTime | Waktu cancel |
| created_by | String | user_id pembuat |
| created_at | DateTime | ISO 8601 |
| updated_by | String | user_id terakhir edit |
| updated_at | DateTime | ISO 8601 |
| input_source | Enum | WEB / MANUAL |

---

### Sheet 3 — CZ (Clarification Zone)

| Kolom | Type | Keterangan |
|-------|------|-----------|
| cz_id | String | Format: CZ-YYYY-XXXXX |
| hu | String | — |
| do_number | String | — |
| sku | String | Untuk duplicate check |
| nama_barang | String | — |
| batch | String | Untuk duplicate check |
| qty_pcs | Number | — |
| keterangan | String | — |
| status | Enum | OPEN / SOLVED |
| storage_tujuan | String | Diisi saat solve |
| catatan_penyelesaian | String | Diisi saat solve |
| created_by | String | user_id |
| created_at | DateTime | — |
| solved_by | String | user_id |
| solved_at | DateTime | — |

---

### Sheet 4 — LOGS

| Kolom | Type | Keterangan |
|-------|------|-----------|
| log_id | String | UUID |
| reference_id | String | issue_id atau cz_id |
| reference_type | Enum | ISSUE / CZ / USER |
| action | String | Lihat daftar action |
| performed_by | String | username |
| timestamp | DateTime | ISO 8601 |
| notes | String | Detail perubahan (JSON diff) |

**Daftar Action Log:**
- `issue_created`
- `issue_edited`
- `issue_solved`
- `issue_cancelled`
- `cz_created`
- `cz_solved`
- `user_created`
- `user_deactivated`
- `user_reactivated`
- `pin_reset`
- `login_success`
- `login_failed`

---

## 15. Dashboard Specification

### 15.1 USER Dashboard (Mobile)

**Komponen:**
1. Header: nama user + tombol logout
2. Summary mini (hanya issue milik sendiri):
   - Badge OPEN: jumlah issue open milik user
3. Tombol aksi besar: "+ Buat Issue Baru" dan "+ Buat CZ Baru"
4. List issue milik user (terbaru di atas)
5. Filter sederhana: All / OPEN / SOLVED / CANCELLED
6. Search by SKU atau Nama Barang

---

### 15.2 ADMIN/SPV Dashboard (Desktop + Mobile)

**Summary Cards (4 card):**
| Card | Data |
|------|------|
| 🟡 OPEN | Total issue status OPEN |
| 🟢 SOLVED | Total issue status SOLVED |
| 🔴 CANCELLED | Total issue status CANCELLED |
| 📅 Hari Ini | Total issue dibuat hari ini |

**Issue Table:**

| Kolom | Sortable | Filter |
|-------|---------|--------|
| Issue ID | Ya | — |
| HU | Tidak | Text search |
| SKU | Ya | Text search |
| Nama Barang | Tidak | Text search |
| Kategori | Tidak | Dropdown |
| Selisih PCS | Ya | — |
| Status | Ya | Dropdown |
| Dibuat Oleh | Tidak | Dropdown user |
| Tanggal | Ya | Date range |
| Aksi | — | — |

**Filter Panel:**
- Tanggal: Date picker (dari - sampai)
- Status: All / OPEN / SOLVED / CANCELLED
- User: Dropdown semua user
- Kategori: Dropdown semua kategori
- HU: Text input
- SKU: Text input

**Recent Activity (10 aktivitas terakhir):**
```
[icon] [username] [action] [issue_id] — [timestamp]
Contoh:
🟢 budi.santoso menyelesaikan ISS-2026-00123 — 2 menit lalu
✏️  andi.wijaya mengedit ISS-2026-00122 — 15 menit lalu
🆕 siti.rahayu membuat ISS-2026-00121 — 1 jam lalu
```

**Export Buttons:**
- Export Excel (.xlsx) — data sesuai filter aktif
- Export PDF — data sesuai filter aktif  
- Print Report — buka dialog print browser

---

## 16. UI/UX Design System

### 16.1 Design Philosophy

**Pendekatan:** Industrial Utility — bersih, fungsional, tegas. Bukan "corporate saas" generic. Tampilan seperti tool operasional profesional yang didesain untuk kondisi lapangan (cahaya terang, layar kecil, tangan mungkin kotor atau pakai sarung tangan).

**Prinsip:**
- **Clarity first**: informasi penting langsung terlihat tanpa scrooling
- **Touch-optimized**: semua elemen interaktif minimal 48×48px
- **Contextual color**: warna bermakna (merah = masalah, hijau = oke, kuning = perhatian)
- **Zero ambiguity**: label jelas, tombol eksplisit, konfirmasi untuk aksi kritis
- **Lean loading**: tidak ada animasi berlebihan — loading cepat di jaringan warehouse

### 16.2 Color Palette

```css
/* Primary */
--color-primary: #1A56DB;          /* Blue — aksi utama */
--color-primary-dark: #1E429F;     /* Blue dark — hover */
--color-primary-light: #EBF5FF;    /* Blue light — background highlight */

/* Status Colors */
--color-open: #D97706;             /* Amber — OPEN status */
--color-open-bg: #FFFBEB;
--color-solved: #059669;           /* Emerald — SOLVED status */
--color-solved-bg: #ECFDF5;
--color-cancelled: #DC2626;        /* Red — CANCELLED status */
--color-cancelled-bg: #FEF2F2;

/* Selisih Colors */
--color-selisih-minus: #DC2626;    /* Merah — qty kurang */
--color-selisih-plus: #059669;     /* Hijau — qty lebih */
--color-selisih-zero: #6B7280;     /* Abu — sama */

/* Neutral */
--color-bg: #F9FAFB;               /* Background halaman */
--color-surface: #FFFFFF;          /* Card / panel surface */
--color-border: #E5E7EB;
--color-text-primary: #111827;
--color-text-secondary: #6B7280;
--color-text-muted: #9CA3AF;

/* Danger */
--color-danger: #DC2626;
--color-danger-light: #FEF2F2;
```

### 16.3 Typography

```css
/* Font Stack */
font-family: 'DM Sans', 'Noto Sans', system-ui, sans-serif;

/* Scale */
--text-xs: 11px;     /* Label kecil, metadata */
--text-sm: 13px;     /* Body kecil, secondary */
--text-base: 15px;   /* Body utama */
--text-lg: 17px;     /* Heading kecil */
--text-xl: 20px;     /* Heading sedang */
--text-2xl: 24px;    /* Heading besar */
--text-3xl: 30px;    /* Judul halaman */

/* Weight */
Regular: 400
Medium: 500
Semibold: 600
Bold: 700
```

### 16.4 Spacing & Layout

```css
/* Base unit: 4px */
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px

/* Border Radius */
--radius-sm: 6px     /* Input, small badge */
--radius-md: 10px    /* Card, button */
--radius-lg: 16px    /* Modal, bottom sheet */
--radius-full: 9999px /* Pill badge */
```

### 16.5 Component States

**Button:**
- Default → Hover (warna gelap) → Active (sedikit scale down) → Disabled (opacity 40%)

**Input:**
- Default → Focus (border primary + ring) → Error (border merah + pesan error)

**Card:**
- Default → Hover (shadow lebih dalam, slight lift)

---

## 17. Mobile UX — User Interface (Spesifikasi Detail)

### 17.1 Target & Konteks Pemakaian

USER (staff inbound) menggunakan sistem di:
- Area gudang dengan cahaya bervariasi
- Sambil berdiri atau bergerak
- Koneksi internet bisa tidak stabil
- Layar smartphone ukuran 5–7 inch

**Implikasi design:**
- Contrast ratio WCAG AA minimum
- Font minimum 15px body
- Tombol minimum 48px tinggi
- Form sesedikit mungkin scroll
- Input sesedikit mungkin keyboard — pakai dropdown, number pad

---

### 17.2 Halaman Login USER (`/login`)

**Layout:**
```
┌──────────────────────────┐  ← full screen
│                          │
│   [Logo / Nama App]      │
│   Inbound Issue Tracker  │
│                          │
│  ┌────────────────────┐  │
│  │ Username           │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ PIN  [••••••] 👁   │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │    MASUK           │  │  ← button full width, 56px tinggi
│  └────────────────────┘  │
│                          │
│  Admin? Login di sini    │  ← link kecil di bawah
│                          │
└──────────────────────────┘
```

**Behavior:**
- PIN input: tampilkan numpad native (inputmode="numeric")
- Toggle show/hide PIN
- Error: "Username atau PIN salah" (tidak spesifik mana yang salah)
- Loading state: tombol disabled + spinner
- Setelah 5x gagal: tampil pesan "Hubungi Admin untuk reset PIN"

---

### 17.3 USER Dashboard (`/dashboard`)

**Layout:**
```
┌──────────────────────────┐
│ 👤 Halo, Budi!    [logout]│  ← sticky header, 56px
├──────────────────────────┤
│                          │
│  ┌──────┐   ┌──────┐     │
│  │  5   │   │  12  │     │
│  │ OPEN │   │SOLVED│     │
│  └──────┘   └──────┘     │  ← summary mini card
│                          │
│ ┌──────────────────────┐ │
│ │  + BUAT ISSUE BARU   │ │  ← primary button, 56px
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │  + BUAT CZ BARU      │ │  ← secondary button, 56px
│ └──────────────────────┘ │
│                          │
│  Issue Saya              │
│  [All][OPEN][SOLVED][CAR]│  ← filter tab pill
│                          │
│ ┌──────────────────────┐ │
│ │ ISS-2026-00045       │ │
│ │ SKU-001 · BATCH-A1   │ │
│ │ Selisih: -3 PCS  🟡  │ │  ← issue card
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ ISS-2026-00044       │ │
│ │ SKU-005 · BATCH-B2   │ │
│ │ Selisih: +10 PCS 🟢  │ │
│ └──────────────────────┘ │
│                          │
│         [Lebih banyak]   │  ← pagination / load more
└──────────────────────────┘
```

**Issue Card komponen:**
- Issue ID (monospace font kecil)
- Nama Barang (bold)
- SKU · Batch
- Selisih PCS (merah jika minus, hijau jika plus)
- Kategori issue
- Status badge (pill)
- Timestamp relatif ("2 jam lalu")
- Tap → buka detail issue

---

### 17.4 Form Buat Issue (`/issues/new`)

**Layout — scroll form:**
```
┌──────────────────────────┐
│ ← Buat Issue Baru        │  ← header + back button
├──────────────────────────┤
│                          │
│  SKU *                   │
│  ┌────────────────────┐  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  Nama Barang *           │
│  ┌────────────────────┐  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  Batch                   │
│  ┌────────────────────┐  │
│  │                    │  │
│  └────────────────────┘  │
│  ⚠️  Cek duplikat...     │  ← inline duplicate check
│                          │
│  HU             DO       │
│  ┌──────────┐ ┌────────┐ │
│  │          │ │        │ │  ← 2 kolom
│  └──────────┘ └────────┘ │
│                          │
│  Qty System (PCS) *      │
│  ┌────────────────────┐  │
│  │                    │  │  ← inputmode="numeric"
│  └────────────────────┘  │
│                          │
│  Qty Fisik (PCS) *       │
│  ┌────────────────────┐  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  Selisih: -3 PCS         │  ← auto-calculated, highlight warna
│                          │
│  Kategori Issue *        │
│  ┌────────────────────┐  │
│  │ Pilih kategori  ▼  │  │  ← native select / custom dropdown
│  └────────────────────┘  │
│                          │
│  Keterangan              │
│  ┌────────────────────┐  │
│  │                    │  │
│  │                    │  │  ← textarea, 4 baris
│  └────────────────────┘  │
│                          │
│  Foto Bukti (opsional)   │
│  ┌──────┐ ┌──────┐       │
│  │  📷  │ │  +   │       │  ← thumbnail + add button
│  └──────┘ └──────┘       │
│                          │
│ ┌──────────────────────┐ │
│ │    SIMPAN ISSUE      │ │  ← full width, sticky bottom
│ └──────────────────────┘ │
└──────────────────────────┘
```

**UX Detail:**
- Field wajib ditandai `*` dan label merah jika belum diisi saat submit
- Qty field: keyboard numeric, tidak menerima huruf
- Selisih diupdate saat blur dari field Qty
- Duplicate check trigger saat blur dari field Batch
- Tombol "Simpan" tetap di bawah layar (sticky) agar tidak perlu scroll saat mau submit
- Setelah berhasil: toast "Issue berhasil dibuat!" + redirect ke detail issue

---

### 17.5 Detail Issue (`/issues/[id]`)

**Layout:**
```
┌──────────────────────────┐
│ ← ISS-2026-00045    🟡   │  ← header + status badge
├──────────────────────────┤
│                          │
│  SKU-001                 │
│  Nama Produk ABC         │  ← nama barang (besar)
│  Batch: BATCH-A1         │
│                          │
│  ┌──────────────────────┐ │
│  │ HU: HU-001234        │ │
│  │ DO: DO-567890        │ │
│  │ Kategori: Selisih Qty│ │  ← info card
│  └──────────────────────┘ │
│                          │
│  Qty System    Qty Fisik  │
│     100    →     97      │
│           Selisih: -3    │  ← visual diff
│                          │
│  Keterangan:             │
│  "Item rusak di pallet   │
│   paling bawah..."       │
│                          │
│  Foto Bukti:             │
│  ┌────┐ ┌────┐           │
│  │ 📷 │ │ 📷 │           │  ← thumbnail, tap untuk full
│  └────┘ └────┘           │
│                          │
│  Dibuat oleh: Budi S.    │
│  24 Mei 2026, 14:30      │
│                          │
├──────────────────────────┤
│                          │
│  [Edit]   [Hanya OPEN]   │  ← tombol kondisional
│                          │
└──────────────────────────┘
```

---

## 18. Desktop & Mobile UX — Admin/SPV Interface (Spesifikasi Detail)

### 18.1 Layout Admin — Desktop

```
┌─────────────────────────────────────────────────────────────┐
│  [≡ IITS]  Dashboard  Issues  CZ  Users  Reports   [👤 SPV] │  ← top nav 64px
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  🟡 28   │ │  🟢 145  │ │  🔴  3   │ │  📅  7   │      │  ← summary cards
│  │  OPEN    │ │  SOLVED  │ │CANCELLED │ │  HARI INI│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Cari SKU, HU, Nama Barang...    [Filter] [Export] │  │  ← search bar
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Issue ID  │ HU     │ SKU   │ Kategori │Selisih│Status│  │  ← table header
│  ├──────────────────────────────────────────────────────┤  │
│  │ISS-00045  │HU-1234 │SKU-001│Selisih(-) │ -3   │🟡OPEN│  │
│  │ISS-00044  │HU-1230 │SKU-005│Kerusakan  │ 0    │🟢SOL │  │
│  │ISS-00043  │HU-1228 │SKU-012│Label Rusak│ -1   │🟡OPEN│  │
│  └──────────────────────────────────────────────────────┘  │
│  [Halaman 1 dari 15]    [< Prev]  [Next >]                 │
│                                                             │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │  Recent Activity       │  │  CZ Summary            │    │
│  │  ─────────────────     │  │  OPEN: 4               │    │
│  │  budi: buat ISS-00045  │  │  SOLVED: 23            │    │
│  │  siti: solve ISS-00040 │  │                        │    │
│  │  andi: edit ISS-00038  │  │  [Lihat Semua CZ]      │    │
│  └────────────────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

### 18.2 Admin — Filter Panel (Sidebar/Dropdown)

```
┌──────────────────────────┐
│  Filter Issue            │  [Reset] [Terapkan]
├──────────────────────────┤
│ Tanggal                  │
│ [  24 Mei 2026  ] s/d    │
│ [  26 Mei 2026  ]        │
│                          │
│ Status                   │
│ ○ Semua  ○ OPEN          │
│ ○ SOLVED ○ CANCELLED     │
│                          │
│ Dibuat Oleh              │
│ [Pilih user         ▼]   │
│                          │
│ Kategori                 │
│ [Pilih kategori     ▼]   │
│                          │
│ HU                       │
│ [                  ]     │
│                          │
│ SKU                      │
│ [                  ]     │
└──────────────────────────┘
```

---

### 18.3 Admin — Detail & Action Issue

**Klik issue di table → buka side panel (desktop) atau full page (mobile)**

```
┌──────────────────────────────────────┐
│ ISS-2026-00045               [Tutup] │
├──────────────────────────────────────┤
│ Status: 🟡 OPEN                      │
│                                      │
│ SKU: SKU-001                         │
│ Nama: Produk ABC 500ml               │
│ Batch: BATCH-A1                      │
│ HU: HU-001234 · DO: DO-567890        │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Qty System │ Qty Fisik │ Selisih │ │
│ │    100     │    97     │   -3    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Kategori: Selisih Qty (Kurang)       │
│ Keterangan: "Item hilang di pallet"  │
│                                      │
│ Foto: [📷 Foto 1] [📷 Foto 2]        │
│                                      │
│ Dibuat: budi.santoso · 24 Mei 14:30  │
│ Diperbarui: — · —                   │
│                                      │
├──────────────────────────────────────┤
│  [✏️ Edit]  [✅ Selesaikan]  [❌ Batalkan] │
└──────────────────────────────────────┘
```

**Tombol aksi:**
- **Edit**: buka form edit inline atau modal
- **Selesaikan**: konfirmasi dialog → input catatan (opsional) → ubah ke SOLVED
- **Batalkan**: konfirmasi dialog → input alasan (opsional) → ubah ke CANCELLED

---

### 18.4 User Management Page (Admin only)

```
┌──────────────────────────────────────────────┐
│ Manajemen User                  [+ Tambah User]│
├──────────────────────────────────────────────┤
│ 🔍 Cari nama atau username...                │
├──────────────────────────────────────────────┤
│ Nama         │ Username  │ Role  │Status│Aksi │
├──────────────────────────────────────────────┤
│ Budi Santoso │ budi.s    │ USER  │ 🟢   │ ··· │
│ Siti Rahayu  │ siti.r    │ USER  │ 🟢   │ ··· │
│ Andi Wijaya  │ andi.w    │ SPV   │ 🟢   │ ··· │
│ Joko Susilo  │ joko.s    │ USER  │ 🔴   │ ··· │
└──────────────────────────────────────────────┘
```

**Menu aksi (···):**
- Reset PIN
- Deactivate / Reactivate
- Lihat histori issue user

---

### 18.5 Mobile Admin View

Untuk ADMIN/SPV yang akses via smartphone:
- Navigation berubah ke bottom tab bar
- Dashboard tampil sebagai stacked cards vertikal
- Table issue berubah ke card list (mirip user view tapi dengan more info)
- Side panel berubah ke full-screen bottom sheet
- Tombol aksi tetap visible sticky di bawah

---

### 18.6 Solve Issue — Confirm Dialog

```
┌──────────────────────────┐
│  Selesaikan Issue?       │
│                          │
│  ISS-2026-00045          │
│  SKU-001 · BATCH-A1      │
│                          │
│  Storage Tujuan:         │
│  ┌────────────────────┐  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  Catatan (opsional):     │
│  ┌────────────────────┐  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  [Batal]  [Ya, Selesaikan]│
└──────────────────────────┘
```

---

### 18.7 Notifikasi & Toast System

| Tipe | Kapan | Durasi |
|------|-------|--------|
| ✅ Success (hijau) | Berhasil simpan, solve, dll | 3 detik |
| ❌ Error (merah) | Gagal, validasi error | 5 detik |
| ⚠️ Warning (kuning) | Duplikat terdeteksi | Sampai dismiss |
| ℹ️ Info (biru) | Informasi umum | 3 detik |

Toast muncul di kanan atas (desktop) atau bawah tengah (mobile).

---

## 19. API Specification

### Base URL
`/api/v1/`

### Authentication Header
```
Authorization: Bearer <session-token>
```

### Endpoints

#### Auth
| Method | Endpoint | Deskripsi |
|--------|----------|---------|
| POST | `/api/auth/login` | Login USER atau ADMIN |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/session` | Cek session aktif |

#### Issues
| Method | Endpoint | Deskripsi | Role |
|--------|----------|---------|------|
| GET | `/api/issues` | List semua issue (dengan filter) | ADMIN/SPV |
| GET | `/api/issues/mine` | List issue milik user login | USER |
| GET | `/api/issues/:id` | Detail issue | All |
| POST | `/api/issues` | Buat issue baru | All |
| PUT | `/api/issues/:id` | Edit issue | Conditional |
| PATCH | `/api/issues/:id/solve` | Solve issue | ADMIN/SPV |
| PATCH | `/api/issues/:id/cancel` | Cancel issue | ADMIN/SPV |

#### CZ
| Method | Endpoint | Deskripsi | Role |
|--------|----------|---------|------|
| GET | `/api/cz` | List semua CZ record | ADMIN/SPV |
| GET | `/api/cz/mine` | List CZ milik user | USER |
| POST | `/api/cz` | Buat CZ record | All |
| PATCH | `/api/cz/:id/solve` | Solve CZ | ADMIN/SPV |

#### Users
| Method | Endpoint | Deskripsi | Role |
|--------|----------|---------|------|
| GET | `/api/users` | List semua user | ADMIN |
| POST | `/api/users` | Tambah user | ADMIN |
| PATCH | `/api/users/:id/reset-pin` | Reset PIN | ADMIN |
| PATCH | `/api/users/:id/status` | Toggle status | ADMIN |

#### Export
| Method | Endpoint | Deskripsi | Role |
|--------|----------|---------|------|
| GET | `/api/export/excel` | Export Excel | ADMIN/SPV |
| GET | `/api/export/pdf` | Export PDF | ADMIN/SPV |

#### Upload
| Method | Endpoint | Deskripsi |
|--------|----------|---------|
| POST | `/api/upload/photo` | Upload foto ke Google Drive |

---

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Berhasil"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ISSUE",
    "message": "Issue dengan SKU dan Batch ini sudah ada",
    "details": { "existing_id": "ISS-2026-00040" }
  }
}
```

---

## 20. Security Rules

### Spreadsheet
- Akses private — hanya service account dan developer
- Header row dan formula kolom terkunci
- Tidak dibagikan secara publik

### Authentication
- PIN di-hash dengan bcrypt (cost factor 12)
- Password admin di-hash dengan bcrypt
- Session token JWT dengan expiry 8 jam
- Setiap request API memvalidasi session + role

### Access Control
- Setiap API route mengecek role dari session
- USER tidak bisa akses endpoint ADMIN
- USER tidak bisa akses issue user lain
- Edit issue SOLVED membutuhkan role ADMIN/SPV

### Input Sanitization
- Semua input di-trim dan di-sanitize sebelum simpan ke Sheets
- Tidak ada raw SQL (tidak menggunakan SQL DB)
- File upload: cek MIME type, cek ukuran, rename file acak

### Rate Limiting (via Vercel)
- Login endpoint: max 10 request/menit per IP
- Upload endpoint: max 20 request/menit per user

---

## 21. Data Integrity Rules

### No Hard Delete untuk USER

Alasan:
- Preserve histori operasional
- Accountability issue tetap terjaga
- Audit trail lengkap

### Issue SOLVED = Terkunci

USER tidak dapat edit issue yang sudah SOLVED.
ADMIN dapat edit dengan log perubahan otomatis.

### Histori Tetap Ada

User INACTIVE tetap memiliki kepemilikan issue.
Data tidak boleh dihapus tanpa persetujuan developer.

### Log Wajib

Setiap perubahan status issue dan aksi penting wajib dicatat di sheet LOGS.

### Auto-generated Fields

Field berikut tidak boleh diedit manual oleh user:
- `issue_id` / `cz_id` (auto-generate)
- `selisih_pcs` (auto-calculate)
- `created_at`, `created_by`
- `solved_at`, `solved_by`, `cancelled_at`, `cancelled_by`

---

## 22. Print & Export Rules

### Data yang Disertakan dalam Print/Export

| Data | Include? |
|------|---------|
| Issue ID | ✅ |
| HU, DO | ✅ |
| SKU, Nama Barang, Batch | ✅ |
| Qty System, Qty Fisik, Selisih | ✅ |
| Kategori, Keterangan | ✅ |
| Status | ✅ |
| Dibuat Oleh + Tanggal | ✅ |
| Diselesaikan Oleh + Tanggal | ✅ |
| Foto Bukti | ❌ (tidak disertakan) |
| Storage Tujuan | ✅ |

### Format Export

**Excel (.xlsx):**
- Satu sheet utama dengan semua kolom
- Header row frozen
- Kolom selisih berwarna (merah negatif, hijau positif) via conditional formatting
- Nama file: `IITS_Issues_[YYYY-MM-DD].xlsx`

**PDF:**
- Header laporan: nama sistem + tanggal cetak + filter aktif
- Table dengan border
- Footer: halaman X dari Y
- Nama file: `IITS_Issues_[YYYY-MM-DD].pdf`

**Print (browser print):**
- Gunakan CSS `@media print` untuk menyesuaikan tampilan
- Sembunyikan navigasi, sidebar, tombol
- Tampilkan header ringkasan di atas tabel

---

## 23. Fallback Operational Strategy

### Jika Website Down

ADMIN/SPV dapat:
1. Buka Google Sheets langsung
2. Input manual ke sheet ISSUES dengan `input_source = MANUAL`
3. Monitor issue yang ada
4. Export data langsung dari Sheets

### Pencegahan Downtime
- Vercel uptime guarantee 99.9%
- Google Apps Script memiliki retry otomatis
- Tidak ada single point of failure yang kritis (kecuali Google Sheets)

### Recovery
Jika data perlu di-sync setelah downtime:
1. Developer cek log GAS
2. Verifikasi data di Sheets
3. Perbaiki inconsistency manual jika ada

---

## 24. Development Roadmap

### Phase 1 — Planning & Design (1–2 minggu)
- [ ] Finalize workflow dan semua business rule
- [ ] Buat wireframe mobile (user) dan desktop (admin)
- [ ] Finalize database schema
- [ ] Review PRD bersama stakeholder

### Phase 2 — Setup Infrastructure (3–5 hari)
- [ ] Buat Google account khusus sistem
- [ ] Setup Google Sheets dengan 4 sheet (USERS, ISSUES, CZ, LOGS)
- [ ] Deploy Google Apps Script sebagai Web App
- [ ] Setup GitHub repository
- [ ] Init Next.js project + konfigurasi Vercel
- [ ] Setup environment variables

### Phase 3 — Backend Development (2–3 minggu)
- [ ] GAS: endpoint CRUD ISSUES
- [ ] GAS: endpoint CRUD CZ
- [ ] GAS: endpoint USER management
- [ ] GAS: endpoint LOGS
- [ ] GAS: authentication validator
- [ ] Next.js API routes (wrapper untuk GAS)
- [ ] Session management (next-auth)
- [ ] File upload ke Google Drive

### Phase 4 — Frontend Development (3–4 minggu)
- [ ] Design system + component library
- [ ] Halaman login USER (mobile)
- [ ] Halaman login ADMIN
- [ ] USER Dashboard
- [ ] Form create/edit issue
- [ ] Detail issue
- [ ] ADMIN Dashboard
- [ ] Issue table + filter
- [ ] User management page
- [ ] CZ halaman
- [ ] Export/print

### Phase 5 — Testing (1 minggu)
- [ ] Unit test business logic (selisih, duplicate check)
- [ ] Manual testing: login flow, CRUD issue, role restriction
- [ ] Mobile testing: iOS Safari + Android Chrome
- [ ] UAT bersama 2–3 user inbound + 1 supervisor

### Phase 6 — Improvement & Launch
- [ ] Perbaikan berdasarkan feedback UAT
- [ ] Soft launch ke 1 shift dulu
- [ ] Monitoring error & performance
- [ ] Full rollout

---

## 25. Error Handling & Edge Cases

### Login
| Skenario | Handling |
|---------|---------|
| Username tidak ditemukan | Error generic: "Username atau PIN salah" |
| PIN salah | Error generic: "Username atau PIN salah" |
| User INACTIVE | Error: "Akun tidak aktif. Hubungi Admin." |
| 5x gagal login | Pesan: "Coba lagi nanti atau hubungi Admin" |
| Session expired | Redirect ke login + pesan "Sesi berakhir, silakan login kembali" |

### Issue
| Skenario | Handling |
|---------|---------|
| Duplikat SKU+Batch+OPEN | Warning + link ke issue yang sudah ada |
| Qty negatif | Validasi form: "Qty tidak boleh negatif" |
| Upload foto gagal | Toast error + retry manual |
| Edit issue SOLVED (USER) | Tombol edit tidak tampil, akses langsung ditolak API |
| Issue tidak ditemukan | Halaman 404 dengan tombol kembali |

### Network
| Skenario | Handling |
|---------|---------|
| Koneksi terputus | Toast: "Periksa koneksi internet Anda" |
| GAS timeout (>30 detik) | Error: "Sistem sedang lambat, coba lagi" |
| Upload foto timeout | Error dengan opsi retry |

### Edge Cases Bisnis
| Skenario | Handling |
|---------|---------|
| User dihapus (INACTIVE) saat ada issue OPEN | Issue tetap ada, created_by masih username lama |
| ADMIN solve issue yang baru saja diedit USER | Optimistic lock — tampil warning "Data baru tersedia" |
| Dua user buat issue sama bersamaan | Satu berhasil, satu mendapat duplicate warning |

---

## 26. Success Criteria

MVP dianggap berhasil jika setelah 4 minggu deployment:

| Kriteria | Target |
|---------|--------|
| Issue tracking lebih mudah | Feedback positif dari >80% user |
| Catatan manual berkurang | Penurunan penggunaan buku/kertas |
| Supervisor bisa monitor lebih cepat | Waktu response issue turun |
| Duplikat issue berkurang | Jumlah duplicate <5% dari total issue |
| Histori data terjaga | 0 data loss |
| User konsisten gunakan sistem | >90% issue dicatat via web, bukan manual |

---

## Appendix

### Glossary
| Term | Definisi |
|------|---------|
| HU | Handling Unit — unit penanganan fisik barang |
| DO | Delivery Order — dokumen pengiriman dari supplier |
| SKU | Stock Keeping Unit — kode identifikasi produk |
| CZ | Clarification Zone — area penampungan sementara untuk item bermasalah |
| GAS | Google Apps Script — runtime backend serverless dari Google |
| Selisih | Perbedaan antara qty fisik dan qty sistem |

### Konvensi ID
| Tipe | Format | Contoh |
|------|--------|--------|
| Issue ID | ISS-YYYY-NNNNN | ISS-2026-00001 |
| CZ ID | CZ-YYYY-NNNNN | CZ-2026-00001 |
| User ID | UUID v4 | a1b2c3d4-... |
| Log ID | UUID v4 | x9y8z7w6-... |

### Environment Variables

```env
# Google
GOOGLE_SHEETS_ID=
GOOGLE_APPS_SCRIPT_URL=
GOOGLE_DRIVE_FOLDER_ID=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# App
NEXT_PUBLIC_APP_NAME=IITS
```