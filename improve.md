# improve.md — Revision & Feature Improvement Notes

**Project:** Parama Global Inspira DC Jember  
**Version:** 2.0  
**Status:** Ready for Implementation  
**Priority Legend:** 🔴 Critical · 🟡 High · 🟢 Medium · ⚪ Low

---

## Daftar Isi

1. [Fix Upload Foto ke Google Drive & Google Sheets](#1-fix-upload-foto-ke-google-drive--google-sheets)
2. [Merge Issue Logic (SKU + Batch)](#2-merge-issue-logic-sku--batch)
3. [User Can Request Solved](#3-user-can-request-solved)
4. [User Can See All Issues](#4-user-can-see-all-issues)
5. [Created By & Updated By Gunakan Nama User](#5-created-by--updated-by-gunakan-nama-user)
6. [New User ID Format](#6-new-user-id-format)
7. [Validation Logic for Batch & HU Rusak](#7-validation-logic-for-batch--hu-rusak)
8. [Remove SPV Role & Browser Print](#8-remove-spv-role--browser-print)
9. [Auto Uppercase Batch Input](#9-auto-uppercase-batch-input)
10. [Rename Website & Branding](#10-rename-website--branding)
11. [Database Schema Changes](#11-database-schema-changes-summary)
12. [Implementation Order](#12-implementation-order)

---

## 1. Fix Upload Foto ke Google Drive & Google Sheets

**Priority:** 🔴 Critical  
**Type:** Bug Fix + Enhancement

---

### 1.1 Root Cause Checklist

Sebelum memperbaiki code, validasi hal-hal berikut satu per satu:

```
[ ] GOOGLE_DRIVE_FOLDER_ID ada di .env.local dan tidak kosong
[ ] GOOGLE_SERVICE_ACCOUNT_JSON sudah diisi JSON lengkap (bukan path file)
[ ] Folder Google Drive sudah di-share ke email service account sebagai Editor
[ ] Service account memiliki scope: https://www.googleapis.com/auth/drive.file
[ ] MIME type file yang diupload ada di whitelist (jpg, jpeg, png, webp)
[ ] Ukuran file tidak melebihi batas (5 MB)
```

---

### 1.2 Flow Upload yang Benar

```
[User pilih foto di form]
         │
         ▼
[Frontend: validasi ukuran & format file]
         │
         ▼
[POST /api/upload/photo — FormData]
         │
         ▼
[API Route — server side]
    │
    ├─ Autentikasi JWT (cek session)
    ├─ Validasi file (MIME, ukuran)
    ├─ Generate nama file unik:
    │   → {issue_id}_{timestamp}_{random}.jpg
    │
    ▼
[Upload ke Google Drive via googleapis]
    │
    ├─ SUCCESS → dapat fileId
    │     │
    │     ▼
    │  Set permission: anyone with link = reader
    │     │
    │     ▼
    │  Build public URL:
    │  https://drive.google.com/uc?export=view&id={fileId}
    │     │
    │     ▼
    │  Return { success: true, url: "..." }
    │
    └─ FAIL → return { success: false, error: "..." }
         │
         ▼
[API Route — simpan URL ke Google Sheets]
    │
    ├─ Ambil nilai photo_url lama dari row issue
    ├─ Append URL baru (comma-separated jika lebih dari 1)
    ├─ Update kolom photo_url di sheet ISSUES atau CZ
    │
    ▼
[Frontend: tampilkan thumbnail foto yang berhasil diupload]
```

---

### 1.3 Perubahan Code yang Dibutuhkan

#### `/api/upload/photo.ts`

```typescript
// Logika yang harus ada:

// 1. Auth check
const session = await getServerSession(authOptions);
if (!session) return res.status(401).json({ error: 'Unauthorized' });

// 2. Parse FormData
const formData = await req.formData();
const file = formData.get('file') as File;
const issueId = formData.get('issue_id') as string;
const issueType = formData.get('type') as 'issue' | 'cz'; // tambahkan ini

// 3. Validasi file
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

if (!ALLOWED_TYPES.includes(file.type)) {
  return res.status(400).json({ error: 'Format file tidak didukung' });
}
if (file.size > MAX_SIZE) {
  return res.status(400).json({ error: 'Ukuran file melebihi 5MB' });
}

// 4. Generate nama file unik
const ext = file.type.split('/')[1];
const filename = `${issueId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

// 5. Upload ke Google Drive
// 6. Set permission publik (viewable via link)
// 7. Simpan URL ke Google Sheets (append ke photo_url yang ada)
// 8. Return URL
```

---

### 1.4 Struktur Folder Google Drive

```
/IITS-Photos/                       ← GOOGLE_DRIVE_FOLDER_ID ini
  /ISSUES/
    /2026/
      /05-Mei/
        ISS-2026-00001_1234567890_abc.jpg
        ISS-2026-00001_1234567891_def.jpg
  /CZ/
    /2026/
      /05-Mei/
        CZ-2026-00001_1234567890_xyz.jpg
```

---

### 1.5 Error Handling Upload

| Kondisi | Respons ke User |
|---------|----------------|
| File terlalu besar | Toast merah: "Ukuran foto maks 5 MB" |
| Format tidak didukung | Toast merah: "Format foto harus JPG, PNG, atau WEBP" |
| Kuota Drive penuh | Toast merah: "Penyimpanan penuh, hubungi Admin" |
| Koneksi terputus | Toast merah: "Upload gagal, cek koneksi internet" |
| Partial upload (ada foto gagal) | Toast kuning: "2 dari 3 foto berhasil diupload" |
| Service account error | Toast merah: "Sistem error, hubungi Admin" + log ke LOGS |

---

### 1.6 UI — Komponen Upload Foto

```
Foto Bukti (opsional, maks 3 foto)

┌──────┐  ┌──────┐  ┌──────┐
│ 📷   │  │ 📷   │  │  +   │   ← slot 3 foto
│[✕]  │  │[✕]  │  │      │   ← X untuk hapus foto
└──────┘  └──────┘  └──────┘

Tap [+] → buka file picker atau kamera (mobile: defaultnya kamera)
Upload progress: spinner di dalam thumbnail saat uploading
Berhasil: tampil thumbnail preview
Gagal: slot merah dengan ikon ⚠️ dan tombol retry
```

**Atribut input file (mobile-optimized):**
```html
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  capture="environment"   ← langsung buka kamera belakang di mobile
  multiple={false}        ← upload satu per satu
/>
```

---

## 2. Merge Issue Logic (SKU + Batch)

**Priority:** 🔴 Critical  
**Type:** New Feature (Business Logic)

---

### 2.1 Latar Belakang

Dalam operasional inbound, satu SKU dengan batch yang sama bisa mengalami beberapa kali pencatatan selisih dalam satu hari (contoh: pallet tiba bertahap). Sistem harus bisa menggabungkan entri-entri ini dan melacak selisih kumulatif.

---

### 2.2 Definisi Merge

Merge terjadi ketika:
- SKU baru = SKU yang sudah ada di issue OPEN
- Batch baru = Batch yang sudah ada di issue OPEN

Merge **tidak terjadi** jika:
- Status issue lama sudah SOLVED / CANCELLED / WAITING_APPROVAL
- Batch berbeda (meski SKU sama)
- SKU berbeda

---

### 2.3 Merge Flow Diagram

```
[User input issue baru]
         │
         ▼
[Sistem cek: ada issue OPEN dengan SKU + Batch sama?]
         │
   ┌─────┴─────┐
   │ TIDAK     │ YA
   ▼           ▼
[Buat        [Tampilkan Merge Warning Dialog]
issue baru]          │
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
  [Buat issue baru]     [Merge dengan issue yang ada]
  (jika user pilih       (jika user pilih MERGE)
   BUAT BARU — jarang)          │
                                 ▼
                   [Hitung remaining_selisih_pcs]
                   remaining = existing_selisih + new_selisih
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
                   ▼                           ▼
          [Selisih = 0]               [Selisih ≠ 0]
                   │                           │
                   ▼                           ▼
     [Tampil: "Issue Balance!"]   [Update remaining_selisih_pcs]
     [Aktifkan tombol             [Append merge_history]
      Request Solved]             [Update updated_by, updated_at]
```

---

### 2.4 Merge Warning Dialog (UI)

```
┌──────────────────────────────────────────┐
│  ⚠️  Issue Sudah Ada                    │
│                                          │
│  SKU: 4000007775                         │
│  Batch: BM13B                            │
│                                          │
│  Issue yang ada: ISS-2026-00031          │
│  Selisih saat ini: -30 PCS               │
│  Input baru kamu: +30 PCS                │
│                                          │
│  Jika di-merge:                          │
│  Selisih akhir = -30 + 30 = 0 PCS ✅    │
│                                          │
│  ┌──────────────┐  ┌──────────────────┐  │
│  │  Buat Baru   │  │  Merge ke Issue  │  │
│  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────────┘
```

Jika selisih setelah merge masih ada (tidak nol):
```
│  Jika di-merge:                          │
│  Selisih akhir = -30 + 10 = -20 PCS ⚠️  │
```

---

### 2.5 Merge History Format

Kolom `merge_history` di Google Sheets disimpan sebagai JSON string:

```json
[
  {
    "timestamp": "2026-05-24T14:30:00Z",
    "action": "initial",
    "selisih_added": -30,
    "remaining": -30,
    "by": "Budi",
    "keterangan": "Pallet pertama tiba"
  },
  {
    "timestamp": "2026-05-24T16:45:00Z",
    "action": "merge",
    "selisih_added": +10,
    "remaining": -20,
    "by": "Andi",
    "keterangan": "Pallet kedua tiba, masih kurang"
  },
  {
    "timestamp": "2026-05-24T17:30:00Z",
    "action": "merge",
    "selisih_added": +20,
    "remaining": 0,
    "by": "Siti",
    "keterangan": "Pallet ketiga, balance"
  }
]
```

---

### 2.6 Perubahan Database Schema — Sheet ISSUES

Tambahkan kolom baru:

| Kolom Baru | Type | Default | Keterangan |
|------------|------|---------|-----------|
| `remaining_selisih_pcs` | Number | sama dengan `selisih_pcs` | Selisih kumulatif terkini setelah merge |
| `merge_history` | JSON String | `[]` | Array riwayat merge |
| `merge_count` | Number | `0` | Berapa kali di-merge |
| `req_solved_by` | String | `""` | Nama user yang request solved |
| `req_solved_at` | DateTime | `""` | Waktu request solved |

---

### 2.7 Tampilan Merge History di UI (Detail Issue)

```
┌────────────────────────────────────────────┐
│  Riwayat Selisih                           │
│  ─────────────────────────────             │
│  📅 24 Mei 14:30 · Budi (Initial)          │
│     Selisih: -30 PCS → Remaining: -30 PCS  │
│                                            │
│  📅 24 Mei 16:45 · Andi (Merge)            │
│     +10 PCS → Remaining: -20 PCS           │
│                                            │
│  📅 24 Mei 17:30 · Siti (Merge)            │
│     +20 PCS → Remaining: 0 PCS ✅          │
└────────────────────────────────────────────┘
```

---

### 2.8 Notifikasi Balance Matched

Jika setelah merge `remaining_selisih_pcs = 0`:

```
┌──────────────────────────────────────┐
│  ✅  Issue Balance Matched!          │
│                                      │
│  Selisih ISS-2026-00031 sudah nol.   │
│  Kamu bisa mengajukan Request Solved │
│  ke Admin untuk ditutup.             │
│                                      │
│  [Request Solved]   [Nanti Saja]     │
└──────────────────────────────────────┘
```

---

## 3. User Can Request Solved

**Priority:** 🔴 Critical  
**Type:** New Feature (Workflow Change)

---

### 3.1 Latar Belakang

Sebelumnya hanya ADMIN yang bisa solve issue. Ini menyebabkan bottleneck — user sudah tahu issue selesai tapi harus menunggu ADMIN online. Solusinya adalah menambahkan status intermediate `WAITING_APPROVAL` agar user bisa mengajukan permohonan.

---

### 3.2 Issue Status Baru (Updated)

| Status | Deskripsi | Siapa bisa set |
|--------|---------|---------------|
| OPEN | Issue aktif, belum ada aksi | Auto saat create |
| WAITING_APPROVAL | User sudah request solved, menunggu ADMIN | USER (tombol Request Solved) |
| SOLVED | Issue dikonfirmasi selesai oleh ADMIN | ADMIN only |
| CANCELLED | Issue dibatalkan | ADMIN only |

---

### 3.3 Full Issue Lifecycle (Updated)

```
[Create Issue]
      │
      ▼
   OPEN ────────────────────────────────────┐
      │                                     │
      │ User tekan "Request Solved"         │ ADMIN tekan "Cancel"
      ▼                                     ▼
WAITING_APPROVAL                        CANCELLED (terkunci)
      │
      ├──── ADMIN tekan "Approve Solved" ──► SOLVED (terkunci)
      │
      └──── ADMIN tekan "Tolak Request" ──► OPEN (kembali)
                                             │
                                     ADMIN tambahkan catatan
                                     alasan penolakan
```

---

### 3.4 Aturan Tombol Request Solved

Tombol `Request Solved` tampil pada USER jika:
- Issue dibuat oleh user itu sendiri **ATAU** user manapun (karena user kini bisa lihat semua — lihat item 4)
- Status = `OPEN`
- `remaining_selisih_pcs = 0` (balance matched) **ATAU** user memberikan alasan manual

> **Catatan:** Jika `remaining_selisih_pcs ≠ 0`, tombol tetap bisa ditekan tapi user harus mengisi alasan ("Selisih sudah diklarifikasi secara fisik oleh supervisor").

---

### 3.5 Request Solved Dialog (UI)

```
┌──────────────────────────────────────┐
│  Request Solved                      │
│                                      │
│  Issue: ISS-2026-00031               │
│  Remaining Selisih: 0 PCS ✅         │
│                                      │
│  Alasan (opsional jika selisih = 0): │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  [Batal]    [Kirim Request]          │
└──────────────────────────────────────┘
```

Jika selisih masih ada:
```
│  Remaining Selisih: -5 PCS ⚠️        │
│                                      │
│  Alasan WAJIB diisi:                 │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  └──────────────────────────────┘    │
```

---

### 3.6 Tampilan Issue Status `WAITING_APPROVAL`

Di list issue, badge status:

```
🔵 WAITING APPROVAL
```

Di detail issue, ada section tambahan:

```
┌──────────────────────────────────────┐
│  📋 Request Solved                   │
│  Diajukan oleh: Budi                 │
│  Waktu: 24 Mei 2026, 17:35           │
│  Alasan: "Selisih sudah balance"     │
│                                      │
│  [✅ Approve Solved] [❌ Tolak]       │  ← hanya ADMIN
└──────────────────────────────────────┘
```

---

### 3.7 ADMIN Reject Request — Dialog

```
┌──────────────────────────────────────┐
│  Tolak Request Solved?               │
│                                      │
│  Alasan Penolakan (wajib):           │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  [Batal]    [Tolak Request]          │
└──────────────────────────────────────┘
```

Setelah ditolak:
- Status kembali ke OPEN
- Alasan penolakan disimpan di `merge_history` (action: `request_rejected`)
- User mendapat notifikasi visual (badge merah di issue mereka)

---

### 3.8 ADMIN Dashboard — Section Waiting Approval

Tambahkan summary card baru di dashboard ADMIN:

```
┌──────────┐
│  🔵  3   │
│ WAITING  │
│ APPROVAL │
└──────────┘
```

Dan filter di issue table: `All | OPEN | WAITING | SOLVED | CANCELLED`

---

### 3.9 Perubahan Kolom Database

| Kolom | Perubahan |
|-------|-----------|
| `status` | Tambahkan nilai `WAITING_APPROVAL` |
| `req_solved_by` | Nama user yang request |
| `req_solved_at` | Timestamp request |
| `req_solved_reason` | Alasan request (opsional/wajib kondisional) |
| `reject_reason` | Alasan penolakan ADMIN (jika ditolak) |

---

## 4. User Can See All Issues

**Priority:** 🟡 High  
**Type:** Permission Change

---

### 4.1 Alasan Perubahan

Sebelumnya USER hanya bisa lihat issue milik sendiri. Masalah:
- User lain tidak tahu issue yang sudah dibuat, sehingga terjadi duplicate input
- Koordinasi inbound antar staff jadi sulit
- User tidak bisa request solved issue milik rekan

---

### 4.2 Permission Matrix (Updated)

| Feature | USER | ADMIN |
|---------|------|-------|
| Lihat semua issue | ✅ **BARU** | ✅ |
| Buat issue | ✅ | ✅ |
| Edit issue sendiri (OPEN) | ✅ | ✅ |
| Edit issue orang lain | ❌ | ✅ |
| Request Solved issue apapun | ✅ **BARU** | ✅ |
| Approve/Reject Solved | ❌ | ✅ |
| Cancel issue | ❌ | ✅ |
| Manage user | ❌ | ✅ |
| Export data | ❌ | ✅ |

---

### 4.3 USER Dashboard (Updated Layout)

```
┌──────────────────────────┐
│ 👤 Budi · IITS    [logout]│
├──────────────────────────┤
│                          │
│  ┌──────┐ ┌──────┐       │
│  │  28  │ │  5   │       │
│  │ OPEN │ │MINE  │       │  ← total semua OPEN vs issue milik saya
│  └──────┘ └──────┘       │
│                          │
│ ┌──────────────────────┐ │
│ │  + BUAT ISSUE BARU   │ │
│ └──────────────────────┘ │
│                          │
│  🔍 Cari SKU, Nama...    │
│                          │
│  [Semua][Milikku][OPEN]  │
│  [SOLVED][WAITING]       │
│                          │
│ ┌──────────────────────┐ │
│ │ ISS-2026-00045  🟡   │ │
│ │ SKU-001 · BM13B      │ │
│ │ Selisih: -3 PCS      │ │
│ │ oleh: Budi · 2 jam   │ │  ← tampilkan "oleh" karena bisa lihat semua
│ └──────────────────────┘ │
└──────────────────────────┘
```

**Tab Filter:**
- **Semua** — seluruh issue sistem
- **Milikku** — hanya issue yang dibuat user ini
- **OPEN** — semua issue berstatus OPEN
- **WAITING** — semua issue WAITING_APPROVAL
- **SOLVED** — semua issue SOLVED

---

### 4.4 Aksi yang Tetap Dibatasi untuk USER

USER bisa **melihat** semua issue, tapi tetap tidak bisa:
- Edit issue milik orang lain
- Cancel issue
- Approve solved
- Akses halaman admin

Jika user coba akses via URL langsung → redirect ke dashboard + toast "Akses ditolak".

---

## 5. Created By & Updated By Gunakan Nama User

**Priority:** 🟡 High  
**Type:** Data Format Change

---

### 5.1 Perubahan Format

| Field | Sebelum | Sesudah |
|-------|---------|---------|
| `created_by` | `USR-0001` | `Budi` |
| `updated_by` | `USR-0002` | `Andi` |
| `solved_by` | `ADM-0001` | `Fajar` |
| `cancelled_by` | `ADM-0001` | `Fajar` |
| `req_solved_by` | `USR-0003` | `Siti` |
| Log `performed_by` | `USR-0001` | `Budi` |

---

### 5.2 Yang Dimaksud "Nama"

Gunakan field `nama` dari sheet USERS (nama lengkap).

Contoh data USERS:
| user_id | nama | username |
|---------|------|---------|
| ADM-0001 | Fajar Ramadan | fajar.r |
| USER-0001 | Budi Santoso | budi.s |

Yang disimpan di `created_by` = `"Budi Santoso"` (atau cukup `"Budi"` jika `nama` hanya satu kata).

> **Keputusan:** Gunakan `nama` lengkap agar tidak ambigu jika ada nama depan yang sama.

---

### 5.3 Implementasi

Di setiap API route yang menulis ke Sheets, ambil `nama` dari session:

```typescript
// Di session payload, simpan nama saat login
session.user.nama = userData.nama; // bukan hanya username

// Saat write ke Sheets
const createdBy = session.user.nama; // "Budi Santoso"
```

---

### 5.4 Konsekuensi

- Jika user ganti nama → histori lama tetap menyimpan nama lama (tidak auto-update)
- Ini dianggap acceptable untuk tujuan audit
- Jika perlu konsistensi → pertimbangkan simpan `user_id` DAN `nama` (dua kolom), display `nama`, fallback ke `user_id` jika nama kosong

---

## 6. New User ID Format

**Priority:** 🟢 Medium  
**Type:** Format Standard

---

### 6.1 Format Baru

| Role | Format | Contoh |
|------|--------|--------|
| ADMIN | `ADM-NNNN` | `ADM-0001`, `ADM-0002` |
| USER | `USER-NNNN` | `USER-0001`, `USER-0002` |

**N = angka 4 digit, zero-padded, auto-increment per role.**

---

### 6.2 Auto-Increment Logic

```
Saat create user baru:

1. Query sheet USERS
2. Filter by role yang sesuai (ADMIN atau USER)
3. Ambil semua user_id yang match format
4. Ekstrak angka terakhir → cari max
5. Increment +1 → zero-pad jadi 4 digit
6. Generate ID baru

Contoh:
- Existing USER IDs: USER-0001, USER-0002, USER-0004
- Max number = 4
- Next ID = USER-0005
```

---

### 6.3 Edge Case

| Kondisi | Handling |
|---------|---------|
| Belum ada user dengan role itu | Mulai dari `0001` |
| ID gap (misal: USER-0003 dihapus) | Tetap gunakan angka max + 1, jangan isi gap |
| Lebih dari 9999 user | Format extend ke 5 digit: `USER-10000` |
| Race condition (2 user create bersamaan) | Gunakan lock atau timestamp fallback |

---

### 6.4 Migrasi ID Lama

Jika ada user_id lama dengan format UUID atau format berbeda:
- **Jangan ubah ID lama** — histori data akan rusak
- User baru menggunakan format baru
- Tampilkan keduanya normal di UI
- Tidak ada migrasi wajib untuk MVP

---

## 7. Validation Logic for Batch & HU Rusak

**Priority:** 🟡 High  
**Type:** Conditional Validation

---

### 7.1 Problem

Kategori **"HU Rusak"** seringkali terjadi saat label HU tidak terbaca sama sekali. Jika SKU dan Batch dijadikan field wajib, user tidak bisa submit issue padahal kejadiannya nyata.

---

### 7.2 Validation Rules per Kategori

| Kategori | SKU | Batch | HU | DO |
|----------|-----|-------|----|----|
| Selisih Qty (Kurang) | **Wajib** | **Wajib** | Opsional | Opsional |
| Selisih Qty (Lebih) | **Wajib** | **Wajib** | Opsional | Opsional |
| Kerusakan Fisik | **Wajib** | Opsional | Opsional | Opsional |
| Label Rusak / Tidak Terbaca | **Wajib** | Opsional | Opsional | Opsional |
| **HU Rusak** | **Opsional** | **Opsional** | Opsional | Opsional |
| Item Salah Penempatan | **Wajib** | **Wajib** | Opsional | Opsional |
| Lainnya | **Wajib** | Opsional | Opsional | Opsional |

---

### 7.3 Implementasi di Form

```typescript
// Saat user pilih kategori, update aturan validasi secara dinamis

const getValidationSchema = (kategori: string) => {
  const isHURusak = kategori === 'HU_RUSAK';

  return z.object({
    sku: isHURusak
      ? z.string().optional()
      : z.string().min(1, 'SKU wajib diisi'),
    batch: isHURusak
      ? z.string().optional()
      : z.string().min(1, 'Batch wajib diisi'),
    // field lainnya...
  });
};
```

---

### 7.4 UI Feedback

Saat user pilih kategori "HU Rusak":
- Label field SKU berubah: `SKU (opsional untuk HU Rusak)`
- Label field Batch berubah: `Batch (opsional untuk HU Rusak)`
- Asterisk `*` di label menghilang
- Placeholder berubah: `"Isi jika diketahui"`
- Tambahkan info banner kecil:

```
ℹ️  Untuk kategori HU Rusak, SKU dan Batch bersifat opsional
    karena detail barang mungkin belum dapat dibaca.
```

---

### 7.5 Duplicate Check Conditional

Jika SKU kosong (HU Rusak):
- **Skip duplicate check** — tidak bisa cek duplikat tanpa SKU
- Tampilkan peringatan ringan: "Tanpa SKU, cek duplikat dinonaktifkan"

---

### 7.6 Qty Validation untuk HU Rusak

Untuk kategori **HU Rusak**:
- Qty System boleh 0 (jika tidak diketahui)
- Qty Fisik boleh 0
- Selisih otomatis 0 jika keduanya 0
- Ini valid — issue dibuat untuk tujuan dokumentasi fisik, bukan selisih qty

---

## 8. Remove SPV Role & Browser Print

**Priority:** 🟡 High  
**Type:** Simplification

---

### 8.1 Hapus Role SPV

**Role final:**
- `ADMIN`
- `USER`

**Alasan:**
- SPV memiliki permission identik dengan ADMIN
- Mengurangi kompleksitas role management
- Lebih mudah dipahami oleh user operasional

---

### 8.2 Langkah Hapus SPV

```
1. Hapus opsi "SPV" dari dropdown role di:
   - Form tambah user
   - Filter user management
   - Session payload type

2. Update permission matrix: remove kolom SPV

3. Update semua conditional check:
   - if (role === 'ADMIN' || role === 'SPV') → if (role === 'ADMIN')

4. Update TypeScript type:
   - type Role = 'ADMIN' | 'USER'; // hapus 'SPV'

5. Jika ada existing user dengan role SPV di Sheets:
   - Update manual ke ADMIN sebelum deploy
```

---

### 8.3 Hapus Browser Print

**Yang dihapus:**
- Tombol "Print Report" (browser print)
- Fungsi `window.print()`
- CSS `@media print`

**Yang tetap ada:**
- Export PDF (via jsPDF — generate file dan download)
- Export Excel (via SheetJS — generate file dan download)

---

### 8.4 Export Button Layout (Updated)

Sebelum:
```
[Print] [Export PDF] [Export Excel]
```

Sesudah:
```
[⬇ Export PDF] [⬇ Export Excel]
```

---

## 9. Auto Uppercase Batch Input

**Priority:** 🟢 Medium  
**Type:** UX Enhancement + Data Consistency

---

### 9.1 Behavior

Setiap karakter yang diketik di field Batch langsung dikonversi ke uppercase:

```
User ketik: bm13b → tampil: BM13B
User ketik: Bm13b → tampil: BM13B
User ketik: BM13B → tampil: BM13B (tidak berubah)
```

---

### 9.2 Implementasi

```tsx
// React — onChange handler

<input
  type="text"
  value={batch}
  onChange={(e) => setBatch(e.target.value.toUpperCase())}
  onPaste={(e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase();
    setBatch(pasted);
  }}
  placeholder="Contoh: BM13B"
/>
```

Jika menggunakan React Hook Form:
```tsx
<Controller
  name="batch"
  control={control}
  render={({ field }) => (
    <input
      {...field}
      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
    />
  )}
/>
```

---

### 9.3 Berlaku Juga di

- Form buat issue
- Form edit issue
- Form buat CZ record
- Form edit CZ record
- Search/filter field (jika filter by batch)

---

### 9.4 Server-side Safety

Meskipun frontend sudah auto-uppercase, **API juga harus normalize**:

```typescript
// Di API route sebelum simpan ke Sheets
const batch = req.body.batch?.trim().toUpperCase() ?? '';
```

Ini mencegah bypass lewat API langsung (Postman, script, dll).

---

### 9.5 Efek pada Duplicate Check

Duplicate check sekarang case-insensitive by design karena semua batch sudah uppercase:
- `bm13b` == `BM13B` == `Bm13B` → semua dianggap sama
- Tidak perlu `.toLowerCase()` di logika perbandingan karena sudah uppercase semua

---

## 10. Rename Website & Branding

**Priority:** 🟢 Medium  
**Type:** Branding

---

### 10.1 Nama Baru

| Sebelum | Sesudah |
|---------|---------|
| Inbound Issue Tracking System | **Parama Global Inspira DC Jember** |
| IITS (abbreviation) | **PGI-DC** atau **IITS** (internal code, bisa dipertahankan) |

---

### 10.2 Lokasi Perubahan

```
[ ] <title> di layout.tsx → "Parama Global Inspira DC Jember"
[ ] <meta name="description"> → "Sistem Tracking Issue Inbound - DC Jember"
[ ] Logo/wordmark di halaman login
[ ] Header navigasi (navbar)
[ ] Halaman login USER
[ ] Halaman login ADMIN
[ ] Footer (jika ada)
[ ] Export PDF header
[ ] Export Excel header
[ ] Favicon (jika ada logo)
[ ] README.md project
[ ] Error page (404, 500)
[ ] Loading screen / splash
```

---

### 10.3 Branding Guideline

**Nama tampil di UI:**
- Judul halaman: `Parama Global Inspira`
- Sub-judul/tagline: `Distribution Center · Jember`
- Tampilan ramping di mobile: `PGI DC Jember`

**Header Login:**
```
┌──────────────────────────┐
│                          │
│   [Logo PGI jika ada]    │
│                          │
│  Parama Global Inspira   │
│  Distribution Center     │
│       Jember             │
│                          │
│  ─────────────────────   │
│  Inbound Issue Tracker   │
└──────────────────────────┘
```

---

## 11. Database Schema Changes Summary

Rekap semua perubahan kolom Google Sheets dari semua item improvement di atas:

### Sheet ISSUES — Kolom Baru / Diubah

| Kolom | Status | Keterangan |
|-------|--------|-----------|
| `remaining_selisih_pcs` | ✅ Tambah Baru | Selisih kumulatif setelah merge |
| `merge_history` | ✅ Tambah Baru | JSON array riwayat merge |
| `merge_count` | ✅ Tambah Baru | Jumlah kali merge terjadi |
| `req_solved_by` | ✅ Tambah Baru | Nama user yang request solved |
| `req_solved_at` | ✅ Tambah Baru | Timestamp request solved |
| `req_solved_reason` | ✅ Tambah Baru | Alasan request solved |
| `reject_reason` | ✅ Tambah Baru | Alasan ADMIN tolak request |
| `status` | 🔄 Update | Tambah nilai `WAITING_APPROVAL` |
| `created_by` | 🔄 Update | Simpan nama (bukan ID) |
| `updated_by` | 🔄 Update | Simpan nama (bukan ID) |
| `solved_by` | 🔄 Update | Simpan nama (bukan ID) |
| `cancelled_by` | 🔄 Update | Simpan nama (bukan ID) |

### Sheet USERS — Kolom Diubah

| Kolom | Status | Keterangan |
|-------|--------|-----------|
| `user_id` | 🔄 Update | Format baru: `ADM-NNNN` / `USER-NNNN` |
| `role` | 🔄 Update | Hapus nilai `SPV`, hanya `ADMIN` / `USER` |

### Sheet CZ — Kolom Baru

| Kolom | Status | Keterangan |
|-------|--------|-----------|
| `created_by` | 🔄 Update | Simpan nama (bukan ID) |
| `solved_by` | 🔄 Update | Simpan nama (bukan ID) |

### Sheet LOGS — Kolom Diubah

| Kolom | Status | Keterangan |
|-------|--------|-----------|
| `performed_by` | 🔄 Update | Simpan nama (bukan ID) |
| `action` | 🔄 Update | Tambah nilai: `request_solved`, `approve_solved`, `reject_solved`, `issue_merged` |

---

## 12. Implementation Order

Urutan pengerjaan yang direkomendasikan berdasarkan dependency dan prioritas:

### Sprint 1 — Foundation Fix (Week 1)
```
1. [#8]  Hapus role SPV dari codebase
2. [#10] Rename website & update branding
3. [#9]  Auto uppercase batch (frontend + backend)
4. [#6]  Update user ID format (ADM-NNNN / USER-NNNN)
5. [#5]  Ubah created_by/updated_by ke nama user
```

### Sprint 2 — Core Feature Fix (Week 2)
```
6. [#1]  Fix upload foto ke Google Drive + simpan URL ke Sheets
7. [#7]  Conditional validation untuk HU Rusak
8. [#4]  User bisa lihat semua issue (update API + UI)
```

### Sprint 3 — Business Logic (Week 3)
```
9.  [#2] Merge issue logic (SKU + Batch duplicate → merge)
10. [#3] Request Solved workflow + WAITING_APPROVAL status
```

### Sprint 4 — Testing & Polish (Week 4)
```
11. Testing semua flow di mobile (User) + desktop (Admin)
12. UAT bersama 2-3 user inbound + 1 admin
13. Fix bug dari hasil UAT
14. Deploy ke production
```

---

## Appendix — Future Features (Backlog)

Fitur-fitur ini **tidak masuk MVP** tapi sudah diidentifikasi untuk roadmap selanjutnya:

| Fitur | Prioritas | Estimasi |
|-------|-----------|---------|
| Barcode scanner via kamera mobile | 🟡 High | 1 minggu |
| Activity timeline per issue | 🟡 High | 3 hari |
| Notification badge (issue WAITING_APPROVAL) | 🟡 High | 2 hari |
| Auto refresh data (polling setiap 60 detik) | 🟢 Medium | 2 hari |
| Dashboard analytics (grafik trend issue) | 🟢 Medium | 1 minggu |
| Search & filter optimization (debounce, advanced) | 🟢 Medium | 3 hari |
| Dark mode | ⚪ Low | 1 minggu |
| SAP integration | ⚪ Low | TBD |
| Multi-warehouse support | ⚪ Low | TBD |
| Export dengan filter aktif (bukan semua data) | 🟡 High | 2 hari |

---

*Dokumen ini harus di-review ulang setiap sprint selesai dan diupdate jika ada perubahan requirement.*