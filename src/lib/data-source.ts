/**
 * Data Source — Unified access layer
 * ====================================
 * Automatically routes to GAS (production) or mock-data (local dev).
 * GAS is used when GOOGLE_APPS_SCRIPT_URL is configured in env.
 * Mock data is used as fallback for local development only.
 */

import { gas, isGASEnabled } from '@/lib/gas-client';
import * as mock from '@/lib/mock-data';
import {
  Issue,
  CZRecord,
  User,
  ActivityLog,
  IssueCategory,
} from '@/types';

// ─── Type helpers ───────────────────────────────────────────────
type GASResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message?: string;
};

// ─── Issues ─────────────────────────────────────────────────────

export interface IssueListParams {
  mine?: boolean;
  user_id?: string;
  search?: string;
  status?: string;
  kategori?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  sku?: string;
  hu?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

export async function dsGetIssues(params: IssueListParams): Promise<GASResponse<Issue[]>> {
  if (isGASEnabled) {
    const gasParams: Record<string, string | number> = {};
    if (params.user_id) gasParams.user_id = params.user_id;
    if (params.search) gasParams.search = params.search;
    if (params.status && params.status !== 'ALL') gasParams.status = params.status;
    if (params.kategori && params.kategori !== 'ALL') gasParams.kategori = params.kategori;
    if (params.created_by) gasParams.created_by = params.created_by;
    if (params.date_from) gasParams.date_from = params.date_from;
    if (params.date_to) gasParams.date_to = params.date_to;
    if (params.sku) gasParams.sku = params.sku;
    if (params.hu) gasParams.hu = params.hu;
    if (params.page) gasParams.page = params.page;
    if (params.limit) gasParams.limit = params.limit;
    if (params.sort) gasParams.sort = params.sort;
    if (params.order) gasParams.order = params.order;
    return gas.getIssues(gasParams) as Promise<GASResponse<Issue[]>>;
  }

  // Mock fallback
  let issues = mock.getIssues();
  if (params.user_id) issues = issues.filter((i) => i.created_by === params.user_id);
  if (params.search) {
    const q = params.search.toLowerCase();
    issues = issues.filter(
      (i) =>
        (i.sku ?? '').toLowerCase().includes(q) ||
        i.nama_barang.toLowerCase().includes(q) ||
        i.issue_id.toLowerCase().includes(q) ||
        (i.hu ?? '').toLowerCase().includes(q) ||
        (i.do_number ?? '').toLowerCase().includes(q)
    );
  }
  if (params.status && params.status !== 'ALL') issues = issues.filter((i) => i.status === params.status);
  if (params.kategori && params.kategori !== 'ALL')
    issues = issues.filter((i) => i.kategori_issue === (params.kategori as IssueCategory));
  if (params.created_by) issues = issues.filter((i) => i.created_by === params.created_by);
  if (params.sku) issues = issues.filter((i) => (i.sku ?? '').toLowerCase().includes((params.sku ?? '').toLowerCase()));
  if (params.hu) issues = issues.filter((i) => (i.hu ?? '').toLowerCase().includes((params.hu ?? '').toLowerCase()));
  if (params.date_from) {
    issues = issues.filter((i) => (i.created_at || '').split('T')[0] >= params.date_from!);
  }
  if (params.date_to) {
    issues = issues.filter((i) => (i.created_at || '').split('T')[0] <= params.date_to!);
  }

  // Sorting mock fallback
  const sortField = params.sort;
  const sortOrder = params.order || 'desc';

  if (sortField) {
    issues.sort((a, b) => {
      const valA = (a as any)[sortField];
      const valB = (b as any)[sortField];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      // Date sorting
      if (sortField === 'created_at' || sortField === 'solved_at' || sortField === 'cancelled_at' || sortField === 'req_solved_at') {
        const dateA = new Date(valA).getTime();
        const dateB = new Date(valB).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // Number sorting
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      // String sorting
      const strA = String(valA).toLowerCase().trim();
      const strB = String(valB).toLowerCase().trim();
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    // Default newest first
    issues.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const total = issues.length;
  const paginated = issues.slice((page - 1) * limit, page * limit);
  return { success: true, data: paginated, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function dsGetIssueById(id: string): Promise<GASResponse<Issue>> {
  if (isGASEnabled) return gas.getIssue(id) as Promise<GASResponse<Issue>>;
  const issue = mock.getIssueById(id);
  if (!issue) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  return { success: true, data: issue };
}

export async function dsCheckDuplicateIssue(
  sku: string, batch: string, exclude_id?: string
): Promise<{ isDuplicate: boolean; existing_id: string | null }> {
  if (isGASEnabled) {
    const res = await gas.checkDuplicateIssue(sku, batch, exclude_id) as GASResponse<{ isDuplicate: boolean; existing_id: string | null }>;
    return res.data ?? { isDuplicate: false, existing_id: null };
  }
  const issues = mock.getIssues();
  const dup = issues.find(
    (i) => i.sku === sku && i.batch === batch && i.status === 'OPEN' && (exclude_id ? i.issue_id !== exclude_id : true)
  );
  return { isDuplicate: !!dup, existing_id: dup?.issue_id ?? null };
}

export async function dsCreateIssue(
  data: Partial<Issue> & { performed_by?: string }
): Promise<GASResponse<Issue>> {
  if (isGASEnabled) return gas.createIssue(data as Record<string, unknown>) as Promise<GASResponse<Issue>>;
  const issue = mock.createIssue(data);
  return { success: true, data: issue, message: 'Issue berhasil dibuat' };
}

export async function dsUpdateIssue(
  id: string, data: Partial<Issue> & { performed_by?: string }
): Promise<GASResponse<Issue>> {
  if (isGASEnabled) return gas.updateIssue(id, data as Record<string, unknown>) as Promise<GASResponse<Issue>>;
  const updated = mock.updateIssue(id, data);
  if (!updated) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  return { success: true, data: updated };
}

export async function dsSolveIssue(
  id: string, data: { solved_by: string; storage_tujuan?: string; catatan?: string; performed_by?: string }
): Promise<GASResponse<Issue>> {
  if (isGASEnabled) return gas.solveIssue(id, data as Record<string, unknown>) as Promise<GASResponse<Issue>>;
  const updated = mock.updateIssue(id, {
    status: 'SOLVED',
    storage_tujuan: data.storage_tujuan ?? '',
    solved_by: data.solved_by, // nama user, bukan ID
    solved_at: new Date().toISOString(),
    solved_by_name: data.solved_by, // sama, karena sudah nama
  });
  if (!updated) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  mock.addLog({ reference_id: id, reference_type: 'ISSUE', action: 'issue_solved', performed_by: data.performed_by ?? data.solved_by, notes: data.catatan ?? 'Issue diselesaikan' });
  return { success: true, data: updated, message: 'Issue berhasil diselesaikan' };
}

export async function dsCancelIssue(
  id: string, data: { cancelled_by: string; alasan?: string; performed_by?: string }
): Promise<GASResponse<Issue>> {
  if (isGASEnabled) return gas.cancelIssue(id, data as Record<string, unknown>) as Promise<GASResponse<Issue>>;
  const updated = mock.updateIssue(id, {
    status: 'CANCELLED',
    cancelled_by: data.cancelled_by, // nama user, bukan ID
    cancelled_at: new Date().toISOString(),
    cancelled_by_name: data.cancelled_by,
  });
  if (!updated) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  mock.addLog({ reference_id: id, reference_type: 'ISSUE', action: 'issue_cancelled', performed_by: data.performed_by ?? data.cancelled_by, notes: data.alasan ?? 'Issue dibatalkan' });
  return { success: true, data: updated, message: 'Issue berhasil dibatalkan' };
}

export async function dsRequestSolved(
  id: string, data: { req_solved_by: string; req_solved_reason?: string; performed_by?: string }
): Promise<GASResponse<Issue>> {
  if (isGASEnabled) return gas.requestSolved(id, data as Record<string, unknown>) as Promise<GASResponse<Issue>>;
  const updated = mock.updateIssue(id, {
    status: 'WAITING_APPROVAL',
    req_solved_by: data.req_solved_by,
    req_solved_at: new Date().toISOString(),
    req_solved_reason: data.req_solved_reason ?? '',
  });
  if (!updated) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  mock.addLog({ reference_id: id, reference_type: 'ISSUE', action: 'request_solved', performed_by: data.performed_by ?? data.req_solved_by, notes: data.req_solved_reason ?? 'Request solved diajukan' });
  return { success: true, data: updated, message: 'Request solved berhasil diajukan' };
}

export async function dsRejectSolved(
  id: string, data: { reject_reason: string; rejected_by: string; performed_by?: string }
): Promise<GASResponse<Issue>> {
  if (isGASEnabled) return gas.rejectSolved(id, data as Record<string, unknown>) as Promise<GASResponse<Issue>>;
  const updated = mock.updateIssue(id, {
    status: 'OPEN',
    reject_reason: data.reject_reason,
    req_solved_by: '',
    req_solved_at: '',
    req_solved_reason: '',
  });
  if (!updated) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  mock.addLog({ reference_id: id, reference_type: 'ISSUE', action: 'reject_solved', performed_by: data.performed_by ?? data.rejected_by, notes: `Request ditolak: ${data.reject_reason}` });
  return { success: true, data: updated, message: 'Request solved ditolak, issue kembali OPEN' };
}

export async function dsMergeIssue(
  id: string,
  data: {
    new_qty_system: number;
    new_qty_fisik: number;
    new_selisih: number;
    keterangan?: string;
    by: string;
    performed_by?: string;
  }
): Promise<GASResponse<Issue>> {
  if (isGASEnabled) return gas.mergeIssue(id, data as Record<string, unknown>) as Promise<GASResponse<Issue>>;

  const existing = mock.getIssueById(id);
  if (!existing) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };

  const existingHistory = (() => {
    try { return JSON.parse(existing.merge_history ?? '[]') as object[]; } catch { return []; }
  })();

  const newRemaining = (existing.remaining_selisih_pcs ?? existing.selisih_pcs) + data.new_selisih;
  const newHistory = [
    ...existingHistory,
    {
      timestamp: new Date().toISOString(),
      action: 'merge',
      selisih_added: data.new_selisih,
      remaining: newRemaining,
      by: data.by,
      keterangan: data.keterangan ?? '',
    },
  ];

  const updated = mock.updateIssue(id, {
    remaining_selisih_pcs: newRemaining,
    merge_history: JSON.stringify(newHistory),
    merge_count: (existing.merge_count ?? 0) + 1,
    updated_by: data.by,
    updated_at: new Date().toISOString(),
  });

  if (!updated) return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  mock.addLog({ reference_id: id, reference_type: 'ISSUE', action: 'issue_merged', performed_by: data.performed_by ?? data.by, notes: `Merge +${data.new_selisih} PCS. Remaining: ${newRemaining}` });

  return {
    success: true,
    data: { ...updated, remaining_selisih_pcs: newRemaining } as Issue,
    message: 'Merge berhasil',
    ...(newRemaining === 0 ? { balanced: true } as Record<string, unknown> : {}),
  };
}

// ─── CZ ─────────────────────────────────────────────────────────

export async function dsGetCZ(params: { user_id?: string; user_id_alt?: string; username?: string; status?: string; search?: string; date_from?: string; date_to?: string }): Promise<GASResponse<CZRecord[]>> {
  if (isGASEnabled) {
    const p: Record<string, string | number> = {};
    if (params.user_id) p.user_id = params.user_id;
    if (params.user_id_alt) p.user_id_alt = params.user_id_alt;
    if (params.username) p.username = params.username;
    if (params.status && params.status !== 'ALL') p.status = params.status;
    if (params.search) p.search = params.search;
    if (params.date_from) p.date_from = params.date_from;
    if (params.date_to) p.date_to = params.date_to;
    return gas.getCZ(p) as Promise<GASResponse<CZRecord[]>>;
  }
  let records = mock.getCZRecords();
  if (params.user_id) records = records.filter((c) => c.created_by === params.user_id);
  if (params.status && params.status !== 'ALL') records = records.filter((c) => c.status === params.status);
  if (params.search) {
    const q = params.search.toLowerCase();
    records = records.filter((c) =>
      c.sku.toLowerCase().includes(q) ||
      c.nama_barang.toLowerCase().includes(q) ||
      c.cz_id.toLowerCase().includes(q) ||
      (c.hu ?? '').toLowerCase().includes(q) ||
      (c.do_number ?? '').toLowerCase().includes(q)
    );
  }
  if (params.date_from) {
    records = records.filter((c) => (c.created_at || '').split('T')[0] >= params.date_from!);
  }
  if (params.date_to) {
    records = records.filter((c) => (c.created_at || '').split('T')[0] <= params.date_to!);
  }
  return { success: true, data: records, total: records.length };
}

export async function dsGetCZById(id: string): Promise<GASResponse<CZRecord>> {
  if (isGASEnabled) return gas.getCZRecord(id) as Promise<GASResponse<CZRecord>>;
  const record = mock.getCZById(id);
  if (!record) return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  return { success: true, data: record };
}

export async function dsCheckDuplicateCZ(
  sku: string, batch: string, exclude_id?: string
): Promise<{ isDuplicate: boolean; existing_id: string | null }> {
  if (isGASEnabled) {
    const res = await gas.checkDuplicateCZ(sku, batch, exclude_id) as GASResponse<{ isDuplicate: boolean; existing_id: string | null }>;
    return res.data ?? { isDuplicate: false, existing_id: null };
  }
  const records = mock.getCZRecords();
  const dup = records.find(
    (c) => c.sku === sku && c.batch === batch && c.status === 'OPEN' && (exclude_id ? c.cz_id !== exclude_id : true)
  );
  return { isDuplicate: !!dup, existing_id: dup?.cz_id ?? null };
}

export async function dsCreateCZ(
  data: Partial<CZRecord> & { performed_by?: string }
): Promise<GASResponse<CZRecord>> {
  if (isGASEnabled) return gas.createCZ(data as Record<string, unknown>) as Promise<GASResponse<CZRecord>>;
  const record = mock.createCZ(data);
  return { success: true, data: record, message: 'CZ record berhasil dibuat' };
}

export async function dsSolveCZ(
  id: string, data: { solved_by: string; storage_tujuan: string; catatan_penyelesaian?: string; performed_by?: string }
): Promise<GASResponse<CZRecord>> {
  if (isGASEnabled) return gas.solveCZ(id, data as Record<string, unknown>) as Promise<GASResponse<CZRecord>>;
  const updated = mock.updateCZ(id, {
    status: 'SOLVED', storage_tujuan: data.storage_tujuan,
    catatan_penyelesaian: data.catatan_penyelesaian ?? '',
    solved_by: data.solved_by, solved_at: new Date().toISOString(),
    solved_by_name: mock.getUserById(data.solved_by)?.nama,
  });
  if (!updated) return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  mock.addLog({ reference_id: id, reference_type: 'CZ', action: 'cz_solved', performed_by: data.performed_by ?? data.solved_by, notes: `CZ diselesaikan ke ${data.storage_tujuan}` });
  return { success: true, data: updated, message: 'CZ record berhasil diselesaikan' };
}

export async function dsUpdateCZ(
  id: string, data: Partial<CZRecord> & { performed_by?: string }
): Promise<GASResponse<CZRecord>> {
  if (isGASEnabled) return gas.updateCZ(id, data as Record<string, unknown>) as Promise<GASResponse<CZRecord>>;
  const updated = mock.updateCZ(id, data);
  if (!updated) return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  mock.addLog({ reference_id: id, reference_type: 'CZ', action: 'cz_edited', performed_by: data.performed_by ?? 'system', notes: 'CZ record diperbarui' });
  return { success: true, data: updated, message: 'CZ record berhasil diperbarui' };
}

export async function dsDeleteCZ(
  id: string, performed_by: string
): Promise<GASResponse<void>> {
  if (isGASEnabled) return gas.deleteCZ(id, { performed_by }) as Promise<GASResponse<void>>;
  const deleted = mock.deleteCZ(id);
  if (!deleted) return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  mock.addLog({ reference_id: id, reference_type: 'CZ', action: 'cz_deleted', performed_by, notes: 'CZ record dihapus' });
  return { success: true, message: 'CZ record berhasil dihapus' };
}

// ─── Users ──────────────────────────────────────────────────────

export async function dsGetUsers(params?: { search?: string }): Promise<GASResponse<User[]>> {
  if (isGASEnabled) return gas.getUsers(params as Record<string, string>) as Promise<GASResponse<User[]>>;
  let users = mock.getUsers().map(({ pin_hash: _, ...u }) => u as User);
  if (params?.search) {
    const q = params.search.toLowerCase();
    users = users.filter((u) => u.nama.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
  }
  return { success: true, data: users, total: users.length };
}

export async function dsGetUserById(id: string): Promise<GASResponse<User>> {
  if (isGASEnabled) return gas.getUser(id) as Promise<GASResponse<User>>;
  const user = mock.getUserById(id);
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  const { pin_hash: _, ...safe } = user;
  return { success: true, data: safe as User };
}

export async function dsGetUserForAuth(username: string): Promise<{ user: User; pin_hash: string } | null> {
  if (isGASEnabled) {
    const res = await gas.getUserForAuth(username) as GASResponse<{ user: User; pin_hash: string }>;
    return res.data ?? null;
  }
  const user = mock.getUserByUsername(username);
  if (!user) return null;
  const cred = mock.getMockCredential(username);
  if (!cred?.pin_hash) return null;
  return { user, pin_hash: cred.pin_hash };
}

export async function dsGetAdminForAuth(email: string): Promise<{ user: User; password_hash: string } | null> {
  if (isGASEnabled) {
    const res = await gas.getAdminForAuth(email) as GASResponse<{ user: User; password_hash: string }>;
    return res.data ?? null;
  }
  const cred = mock.getMockAdminCredential(email);
  if (!cred) return null;
  const user = mock.getUserById(cred.user_id);
  if (!user) return null;
  return { user, password_hash: cred.password_hash };
}

export async function dsCreateUser(
  data: Partial<User> & { pin_hash: string; performed_by?: string }
): Promise<GASResponse<User>> {
  if (isGASEnabled) return gas.createUser(data as Record<string, unknown>) as Promise<GASResponse<User>>;
  const existing = mock.getUsers().find((u) => u.username === data.username);
  if (existing) return { success: false, error: { code: 'DUPLICATE_USERNAME', message: 'Username sudah digunakan' } };
  const user = mock.addUser(data);
  mock.setMockCredentialPinHash(data.username!, data.pin_hash);
  const { pin_hash: _, ...safe } = user as User & { pin_hash?: string };
  return { success: true, data: safe as User, message: 'User berhasil ditambahkan' };
}

export async function dsResetPin(
  id: string, data: { pin_hash: string; performed_by?: string }
): Promise<GASResponse<null>> {
  if (isGASEnabled) return gas.resetPin(id, data as Record<string, unknown>) as Promise<GASResponse<null>>;
  const user = mock.getUserById(id);
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  mock.setMockCredentialPinHash(user.username, data.pin_hash);
  mock.updateUser(id, { updated_at: new Date().toISOString() });
  mock.addLog({ reference_id: id, reference_type: 'USER', action: 'pin_reset', performed_by: data.performed_by ?? 'admin', notes: `PIN user ${user.username} direset` });
  return { success: true, data: null, message: 'PIN berhasil direset' };
}

export async function dsToggleStatus(
  id: string, data: { performed_by?: string }
): Promise<GASResponse<null>> {
  if (isGASEnabled) return gas.toggleStatus(id, data as Record<string, unknown>) as Promise<GASResponse<null>>;
  const user = mock.getUserById(id);
  if (!user) return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  mock.updateUser(id, { status: newStatus });
  mock.addLog({ reference_id: id, reference_type: 'USER', action: newStatus === 'ACTIVE' ? 'user_reactivated' : 'user_deactivated', performed_by: data.performed_by ?? 'admin', notes: `Status diubah ke ${newStatus}` });
  return { success: true, data: null, message: `User berhasil di-${newStatus === 'ACTIVE' ? 'aktifkan' : 'nonaktifkan'}` };
}

// ─── Dashboard & Logs ────────────────────────────────────────────

export async function dsGetDashboard(): Promise<GASResponse<{ summary: unknown; recent_activity: ActivityLog[] }>> {
  if (isGASEnabled) return gas.getDashboard() as Promise<GASResponse<{ summary: unknown; recent_activity: ActivityLog[] }>>;
  const issues = mock.getIssues();
  const czRecords = mock.getCZRecords();
  const logs = mock.getLogs().slice(0, 10);
  const today = new Date().toDateString();
  return {
    success: true,
    data: {
      summary: {
        open: issues.filter((i) => i.status === 'OPEN').length,
        waiting_approval: issues.filter((i) => i.status === 'WAITING_APPROVAL').length,
        solved: issues.filter((i) => i.status === 'SOLVED').length,
        cancelled: issues.filter((i) => i.status === 'CANCELLED').length,
        today: issues.filter((i) => new Date(i.created_at).toDateString() === today).length,
        cz_open: czRecords.filter((c) => c.status === 'OPEN').length,
        cz_solved: czRecords.filter((c) => c.status === 'SOLVED').length,
      },
      recent_activity: logs,
    },
  };
}

export async function dsGetLogs(params?: {
  limit?: number;
  reference_id?: string;
  reference_type?: string;
}): Promise<GASResponse<ActivityLog[]>> {
  if (isGASEnabled) {
    const p: Record<string, string | number> = {};
    if (params?.limit) p.limit = params.limit;
    if (params?.reference_id) p.reference_id = params.reference_id;
    if (params?.reference_type) p.reference_type = params.reference_type;
    return gas.getLogs(p) as Promise<GASResponse<ActivityLog[]>>;
  }
  let logs = mock.getLogs();
  if (params?.reference_id) logs = logs.filter((l) => l.reference_id === params.reference_id);
  if (params?.reference_type) logs = logs.filter((l) => l.reference_type === params.reference_type as never);
  return { success: true, data: logs.slice(0, params?.limit ?? 10), total: logs.length };
}

export async function dsAddLog(data: {
  reference_id: string;
  reference_type: string;
  action: string;
  performed_by: string;
  notes?: string;
}): Promise<void> {
  if (isGASEnabled) {
    await gas.addLog(data as Record<string, unknown>);
    return;
  }
  mock.addLog({
    reference_id: data.reference_id,
    reference_type: data.reference_type as never,
    action: data.action as never,
    performed_by: data.performed_by,
    notes: data.notes,
  });
}
