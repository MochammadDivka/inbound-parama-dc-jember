import { User, Issue, CZRecord, ActivityLog, DashboardSummary } from '@/types';
import { hashSecretSync } from '@/lib/bcrypt';

// ─── Mock Credentials (hashed) ─────────────────────────────────────
// PIN "123456" hashed with bcrypt cost 12 at build-time

interface UserCredential {
  pin_hash: string;
}

interface AdminCredential {
  password_hash: string;
  user_id: string;
}

// These are pre-hashed at module init time for mock data
// In production, GAS stores the hashes in Google Sheets
const PIN_DEFAULT = '123456';
const PASS_ADMIN_DEFAULT = 'admin123';
const PASS_SPV_DEFAULT = 'spv12345';

const DEFAULT_PIN_HASH = hashSecretSync(PIN_DEFAULT);
const ADMIN_PASS_HASH = hashSecretSync(PASS_ADMIN_DEFAULT);
const SPV_PASS_HASH = hashSecretSync(PASS_SPV_DEFAULT);

// username → credential map (mutable for PIN reset)
const mockCredentials: Map<string, UserCredential> = new Map([
  ['budi.santoso', { pin_hash: DEFAULT_PIN_HASH }],
  ['siti.rahayu', { pin_hash: DEFAULT_PIN_HASH }],
  ['andi.wijaya', { pin_hash: DEFAULT_PIN_HASH }],
  ['admin', { pin_hash: DEFAULT_PIN_HASH }],
  ['dewi.permata', { pin_hash: DEFAULT_PIN_HASH }],
]);

// email → credential map (mutable for password changes)
const mockAdminCredentials: Map<string, AdminCredential> = new Map([
  ['admin@parama-dc.com', { password_hash: ADMIN_PASS_HASH, user_id: 'usr-005' }],
  ['spv@parama-dc.com', { password_hash: SPV_PASS_HASH, user_id: 'usr-003' }],
]);

export function getMockCredential(username: string): UserCredential | undefined {
  return mockCredentials.get(username.toLowerCase());
}

export function getMockAdminCredential(email: string): AdminCredential | undefined {
  return mockAdminCredentials.get(email.toLowerCase());
}

export function setMockCredentialPinHash(username: string, pin_hash: string): void {
  const existing = mockCredentials.get(username.toLowerCase());
  if (existing) {
    mockCredentials.set(username.toLowerCase(), { ...existing, pin_hash });
  } else {
    mockCredentials.set(username.toLowerCase(), { pin_hash });
  }
}

// ─── Mock Users ───────────────────────────────────────────────────
export const mockUsers: User[] = [
  {
    user_id: 'usr-001',
    nama: 'Budi Santoso',
    username: 'budi.santoso',
    role: 'USER',
    status: 'ACTIVE',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z',
  },
  {
    user_id: 'usr-002',
    nama: 'Siti Rahayu',
    username: 'siti.rahayu',
    role: 'USER',
    status: 'ACTIVE',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z',
  },
  {
    user_id: 'usr-003',
    nama: 'Andi Wijaya',
    username: 'andi.wijaya',
    role: 'ADMIN',
    status: 'ACTIVE',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z',
  },
  {
    user_id: 'usr-004',
    nama: 'Joko Susilo',
    username: 'joko.susilo',
    role: 'USER',
    status: 'INACTIVE',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-03-15T09:00:00Z',
  },
  {
    user_id: 'usr-005',
    nama: 'Admin Parama',
    username: 'admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    user_id: 'usr-006',
    nama: 'Dewi Permata',
    username: 'dewi.permata',
    role: 'USER',
    status: 'ACTIVE',
    created_at: '2026-02-05T08:00:00Z',
    updated_at: '2026-02-05T08:00:00Z',
  },
];

// ─── Mock Issues ───────────────────────────────────────────────────
export const mockIssues: Issue[] = [
  {
    issue_id: 'ISS-2026-00045',
    hu: 'HU-001234',
    do_number: 'DO-567890',
    sku: 'SKU-001',
    nama_barang: 'Produk ABC 500ml',
    batch: 'BATCH-A1',
    qty_system_pcs: 100,
    qty_fisik_pcs: 97,
    selisih_pcs: -3,
    kategori_issue: 'Selisih Qty (Kurang)',
    keterangan: 'Item hilang di pallet paling bawah, kemungkinan terhitung di DO sebelumnya.',
    photo_url: '',
    status: 'OPEN',
    created_by: 'usr-001',
    created_by_name: 'Budi Santoso',
    created_at: '2026-05-26T07:30:00Z',
    updated_at: '2026-05-26T07:30:00Z',
    input_source: 'WEB',
  },
  {
    issue_id: 'ISS-2026-00044',
    hu: 'HU-001230',
    do_number: 'DO-567885',
    sku: 'SKU-005',
    nama_barang: 'Produk DEF 1Kg',
    batch: 'BATCH-B2',
    qty_system_pcs: 50,
    qty_fisik_pcs: 60,
    selisih_pcs: 10,
    kategori_issue: 'Selisih Qty (Lebih)',
    keterangan: 'Ada kelebihan 10 pcs yang tidak tercatat di sistem.',
    photo_url: '',
    status: 'SOLVED',
    storage_tujuan: 'RACK-A12',
    solved_by: 'usr-003',
    solved_by_name: 'Andi Wijaya',
    solved_at: '2026-05-25T15:00:00Z',
    created_by: 'usr-001',
    created_by_name: 'Budi Santoso',
    created_at: '2026-05-25T10:00:00Z',
    updated_at: '2026-05-25T15:00:00Z',
    input_source: 'WEB',
  },
  {
    issue_id: 'ISS-2026-00043',
    hu: 'HU-001228',
    do_number: 'DO-567880',
    sku: 'SKU-012',
    nama_barang: 'Produk GHI 250g',
    batch: 'BATCH-C3',
    qty_system_pcs: 200,
    qty_fisik_pcs: 199,
    selisih_pcs: -1,
    kategori_issue: 'Label Rusak / Tidak Terbaca',
    keterangan: 'Label barcode rusak terkena air.',
    photo_url: '',
    status: 'OPEN',
    created_by: 'usr-002',
    created_by_name: 'Siti Rahayu',
    created_at: '2026-05-25T09:15:00Z',
    updated_at: '2026-05-25T09:15:00Z',
    input_source: 'WEB',
  },
  {
    issue_id: 'ISS-2026-00042',
    hu: 'HU-001220',
    do_number: 'DO-567870',
    sku: 'SKU-003',
    nama_barang: 'Produk JKL 750ml',
    batch: 'BATCH-D4',
    qty_system_pcs: 80,
    qty_fisik_pcs: 80,
    selisih_pcs: 0,
    kategori_issue: 'Kerusakan Fisik',
    keterangan: 'Beberapa item pecah saat transit, kemasan rusak.',
    photo_url: '',
    status: 'CANCELLED',
    cancelled_by: 'usr-003',
    cancelled_by_name: 'Andi Wijaya',
    cancelled_at: '2026-05-24T16:00:00Z',
    created_by: 'usr-002',
    created_by_name: 'Siti Rahayu',
    created_at: '2026-05-24T11:30:00Z',
    updated_at: '2026-05-24T16:00:00Z',
    input_source: 'WEB',
  },
  {
    issue_id: 'ISS-2026-00041',
    sku: 'SKU-008',
    nama_barang: 'Produk MNO 100ml',
    batch: 'BATCH-E5',
    qty_system_pcs: 300,
    qty_fisik_pcs: 298,
    selisih_pcs: -2,
    kategori_issue: 'Selisih Qty (Kurang)',
    keterangan: '',
    photo_url: '',
    status: 'OPEN',
    created_by: 'usr-006',
    created_by_name: 'Dewi Permata',
    created_at: '2026-05-26T06:00:00Z',
    updated_at: '2026-05-26T06:00:00Z',
    input_source: 'WEB',
  },
  {
    issue_id: 'ISS-2026-00040',
    hu: 'HU-001210',
    sku: 'SKU-015',
    nama_barang: 'Produk PQR 2L',
    batch: 'BATCH-F6',
    qty_system_pcs: 120,
    qty_fisik_pcs: 120,
    selisih_pcs: 0,
    kategori_issue: 'HU Rusak',
    keterangan: 'HU penyok dan robek, isi masih utuh.',
    photo_url: '',
    status: 'SOLVED',
    storage_tujuan: 'RACK-B05',
    solved_by: 'usr-005',
    solved_by_name: 'Admin Parama',
    solved_at: '2026-05-23T14:00:00Z',
    created_by: 'usr-001',
    created_by_name: 'Budi Santoso',
    created_at: '2026-05-23T09:00:00Z',
    updated_at: '2026-05-23T14:00:00Z',
    input_source: 'WEB',
  },
];

// ─── Mock CZ Records ───────────────────────────────────────────────
export const mockCZRecords: CZRecord[] = [
  {
    cz_id: 'CZ-2026-00012',
    hu: 'HU-002001',
    do_number: 'DO-678901',
    sku: 'SKU-020',
    nama_barang: 'Produk STU 500ml',
    batch: 'BATCH-G7',
    qty_pcs: 50,
    keterangan: 'Item diminta SAP untuk dipindahkan ke CZ, menunggu konfirmasi.',
    status: 'OPEN',
    created_by: 'usr-001',
    created_by_name: 'Budi Santoso',
    created_at: '2026-05-26T08:00:00Z',
  },
  {
    cz_id: 'CZ-2026-00011',
    sku: 'SKU-021',
    nama_barang: 'Produk VWX 1Kg',
    batch: 'BATCH-H8',
    qty_pcs: 30,
    keterangan: 'Menunggu instruksi penempatan dari tim gudang.',
    status: 'OPEN',
    created_by: 'usr-002',
    created_by_name: 'Siti Rahayu',
    created_at: '2026-05-25T14:00:00Z',
  },
  {
    cz_id: 'CZ-2026-00010',
    hu: 'HU-001999',
    sku: 'SKU-018',
    nama_barang: 'Produk YZA 250g',
    batch: 'BATCH-I9',
    qty_pcs: 100,
    keterangan: '',
    status: 'SOLVED',
    storage_tujuan: 'RACK-C08',
    catatan_penyelesaian: 'Sudah dipindahkan ke rack yang benar.',
    created_by: 'usr-001',
    created_by_name: 'Budi Santoso',
    created_at: '2026-05-24T10:00:00Z',
    solved_by: 'usr-003',
    solved_by_name: 'Andi Wijaya',
    solved_at: '2026-05-24T16:30:00Z',
  },
];

// ─── Mock Activity Logs ────────────────────────────────────────────
export const mockActivityLogs: ActivityLog[] = [
  {
    log_id: 'log-001',
    reference_id: 'ISS-2026-00045',
    reference_type: 'ISSUE',
    action: 'issue_created',
    performed_by: 'budi.santoso',
    timestamp: '2026-05-26T07:30:00Z',
    notes: 'Issue baru dibuat',
  },
  {
    log_id: 'log-002',
    reference_id: 'ISS-2026-00044',
    reference_type: 'ISSUE',
    action: 'issue_solved',
    performed_by: 'andi.wijaya',
    timestamp: '2026-05-25T15:00:00Z',
    notes: 'Issue diselesaikan',
  },
  {
    log_id: 'log-003',
    reference_id: 'ISS-2026-00043',
    reference_type: 'ISSUE',
    action: 'issue_created',
    performed_by: 'siti.rahayu',
    timestamp: '2026-05-25T09:15:00Z',
    notes: 'Issue baru dibuat',
  },
  {
    log_id: 'log-004',
    reference_id: 'ISS-2026-00041',
    reference_type: 'ISSUE',
    action: 'issue_created',
    performed_by: 'dewi.permata',
    timestamp: '2026-05-26T06:00:00Z',
    notes: 'Issue baru dibuat',
  },
  {
    log_id: 'log-005',
    reference_id: 'CZ-2026-00012',
    reference_type: 'CZ',
    action: 'cz_created',
    performed_by: 'budi.santoso',
    timestamp: '2026-05-26T08:00:00Z',
    notes: 'CZ record baru dibuat',
  },
  {
    log_id: 'log-006',
    reference_id: 'ISS-2026-00042',
    reference_type: 'ISSUE',
    action: 'issue_cancelled',
    performed_by: 'andi.wijaya',
    timestamp: '2026-05-24T16:00:00Z',
    notes: 'Issue dibatalkan',
  },
];

// ─── Dashboard Summary ─────────────────────────────────────────────
export const mockDashboardSummary: DashboardSummary = {
  open: 28,
  waiting_approval: 2,
  solved: 145,
  cancelled: 3,
  today: 7,
  cz_open: 4,
  cz_solved: 23,
};

// ─── In-memory mutable state ───────────────────────────────────────
let issues = [...mockIssues];
let czRecords = [...mockCZRecords];
let users = [...mockUsers];
let logs = [...mockActivityLogs];

let issueCounter = 46;
let czCounter = 13;

// ─── Issues CRUD ──────────────────────────────────────────────────
export function getIssues() {
  return [...issues];
}

export function getIssueById(id: string) {
  return issues.find((i) => i.issue_id === id) ?? null;
}

export function createIssue(data: Partial<Issue>): Issue {
  const padded = String(issueCounter++).padStart(5, '0');
  const year = new Date().getFullYear();
  const issue: Issue = {
    issue_id: `ISS-${year}-${padded}`,
    hu: data.hu ?? '',
    do_number: data.do_number ?? '',
    sku: data.sku!,
    nama_barang: data.nama_barang!,
    batch: data.batch ?? '',
    qty_system_pcs: data.qty_system_pcs!,
    qty_fisik_pcs: data.qty_fisik_pcs!,
    selisih_pcs: data.qty_fisik_pcs! - data.qty_system_pcs!,
    kategori_issue: data.kategori_issue!,
    keterangan: data.keterangan ?? '',
    photo_url: '',
    status: 'OPEN',
    created_by: data.created_by!,
    created_by_name: data.created_by_name,
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.created_at ?? new Date().toISOString(),
    input_source: 'WEB',
  };
  issues = [issue, ...issues];
  return issue;
}

export function updateIssue(id: string, data: Partial<Issue>): Issue | null {
  const idx = issues.findIndex((i) => i.issue_id === id);
  if (idx === -1) return null;
  issues[idx] = { ...issues[idx], ...data, updated_at: new Date().toISOString() };
  return issues[idx];
}

// ─── CZ CRUD ──────────────────────────────────────────────────────
export function getCZRecords() {
  return [...czRecords];
}

export function getCZById(id: string) {
  return czRecords.find((c) => c.cz_id === id) ?? null;
}

export function createCZ(data: Partial<CZRecord>): CZRecord {
  const padded = String(czCounter++).padStart(5, '0');
  const year = new Date().getFullYear();
  const record: CZRecord = {
    cz_id: `CZ-${year}-${padded}`,
    hu: data.hu ?? '',
    do_number: data.do_number ?? '',
    sku: data.sku!,
    nama_barang: data.nama_barang!,
    batch: data.batch!,
    qty_pcs: data.qty_pcs!,
    keterangan: data.keterangan ?? '',
    status: 'OPEN',
    created_by: data.created_by!,
    created_by_name: data.created_by_name,
    created_at: new Date().toISOString(),
  };
  czRecords = [record, ...czRecords];
  return record;
}

export function updateCZ(id: string, data: Partial<CZRecord>): CZRecord | null {
  const idx = czRecords.findIndex((c) => c.cz_id === id);
  if (idx === -1) return null;
  czRecords[idx] = { ...czRecords[idx], ...data };
  return czRecords[idx];
}

export function deleteCZ(id: string): boolean {
  const idx = czRecords.findIndex((c) => c.cz_id === id);
  if (idx === -1) return false;
  czRecords.splice(idx, 1);
  return true;
}

// ─── Users CRUD ───────────────────────────────────────────────────
export function getUsers() {
  return [...users];
}

export function getUserById(id: string) {
  return users.find((u) => u.user_id === id) ?? null;
}

export function getUserByUsername(username: string) {
  return users.find((u) => u.username === username.toLowerCase()) ?? null;
}

export function addUser(data: Partial<User>): User {
  const user: User = {
    user_id: `usr-${String(users.length + 1).padStart(3, '0')}`,
    nama: data.nama!,
    username: data.username!,
    role: data.role ?? 'USER',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  users = [...users, user];
  return user;
}

export function updateUser(id: string, data: Partial<User>): User | null {
  const idx = users.findIndex((u) => u.user_id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data, updated_at: new Date().toISOString() };
  return users[idx];
}

// ─── Logs ─────────────────────────────────────────────────────────
export function getLogs() {
  return [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function addLog(data: Partial<ActivityLog>): ActivityLog {
  const log: ActivityLog = {
    log_id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reference_id: data.reference_id!,
    reference_type: data.reference_type!,
    action: data.action!,
    performed_by: data.performed_by!,
    timestamp: new Date().toISOString(),
    notes: data.notes ?? '',
  };
  logs = [log, ...logs];
  return log;
}
