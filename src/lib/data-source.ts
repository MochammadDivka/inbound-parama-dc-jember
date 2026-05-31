/**
 * Data Source — Unified access layer (Supabase)
 * =============================================
 * Semua operasi database dilakukan langsung ke Supabase PostgreSQL.
 * Foto tetap di-upload ke Google Drive via googleapis (tidak ada GAS lagi).
 *
 * Fungsi-fungsi ds* tetap signature yang sama agar API routes tidak perlu diubah.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import * as mock from '@/lib/mock-data';
import {
  Issue,
  CZRecord,
  User,
  ActivityLog,
  IssueCategory,
} from '@/types';

// ─── Type helpers ───────────────────────────────────────────────────────────

type DBResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message?: string;
};

// ─── ID Generators ──────────────────────────────────────────────────────────

function generateIssueId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `ISS-${year}-${rand}`;
}

function generateCZId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `CZ-${year}-${rand}`;
}

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Helper: konversi row Supabase ke Issue type
function rowToIssue(row: Record<string, unknown>): Issue {
  return {
    issue_id: row.issue_id as string,
    hu: (row.hu as string) || undefined,
    do_number: (row.do_number as string) || undefined,
    sku: (row.sku as string) || undefined,
    nama_barang: row.nama_barang as string,
    batch: (row.batch as string) || undefined,
    qty_system_pcs: row.qty_system_pcs as number,
    qty_fisik_pcs: row.qty_fisik_pcs as number,
    selisih_pcs: row.selisih_pcs as number,
    remaining_selisih_pcs: (row.remaining_selisih_pcs as number) ?? undefined,
    merge_history: (row.merge_history as string) || undefined,
    merge_count: (row.merge_count as number) ?? undefined,
    kategori_issue: row.kategori_issue as IssueCategory,
    keterangan: (row.keterangan as string) || undefined,
    photo_url: (row.photo_url as string) || undefined,
    status: row.status as Issue['status'],
    storage_tujuan: (row.storage_tujuan as string) || undefined,
    solved_by: (row.solved_by as string) || undefined,
    solved_at: (row.solved_at as string) || undefined,
    solved_by_name: (row.solved_by_name as string) || undefined,
    cancelled_by: (row.cancelled_by as string) || undefined,
    cancelled_at: (row.cancelled_at as string) || undefined,
    cancelled_by_name: (row.cancelled_by_name as string) || undefined,
    req_solved_by: (row.req_solved_by as string) || undefined,
    req_solved_at: (row.req_solved_at as string) || undefined,
    req_solved_reason: (row.req_solved_reason as string) || undefined,
    reject_reason: (row.reject_reason as string) || undefined,
    created_by: row.created_by as string,
    created_by_name: (row.created_by_name as string) || undefined,
    created_at: row.created_at as string,
    updated_by: (row.updated_by as string) || undefined,
    updated_by_name: (row.updated_by_name as string) || undefined,
    updated_at: (row.updated_at as string) || undefined,
    input_source: (row.input_source as 'WEB' | 'MANUAL') ?? 'WEB',
  };
}

// Helper: konversi row Supabase ke CZRecord type
function rowToCZ(row: Record<string, unknown>): CZRecord {
  return {
    cz_id: row.cz_id as string,
    hu: (row.hu as string) || undefined,
    do_number: (row.do_number as string) || undefined,
    sku: row.sku as string,
    nama_barang: row.nama_barang as string,
    batch: row.batch as string,
    qty_pcs: row.qty_pcs as number,
    keterangan: (row.keterangan as string) || undefined,
    status: row.status as CZRecord['status'],
    storage_tujuan: (row.storage_tujuan as string) || undefined,
    catatan_penyelesaian: (row.catatan_penyelesaian as string) || undefined,
    created_by: row.created_by as string,
    created_by_name: (row.created_by_name as string) || undefined,
    created_at: row.created_at as string,
    solved_by: (row.solved_by as string) || undefined,
    solved_by_name: (row.solved_by_name as string) || undefined,
    solved_at: (row.solved_at as string) || undefined,
  };
}

// Helper: konversi row Supabase ke User type
function rowToUser(row: Record<string, unknown>): User {
  return {
    user_id: row.user_id as string,
    nama: row.nama as string,
    username: row.username as string,
    email: (row.email as string) || undefined,
    role: row.role as User['role'],
    status: row.status as User['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// Helper: konversi row Supabase ke ActivityLog type
function rowToLog(row: Record<string, unknown>): ActivityLog {
  return {
    log_id: row.log_id as string,
    reference_id: row.reference_id as string,
    reference_type: row.reference_type as ActivityLog['reference_type'],
    action: row.action as ActivityLog['action'],
    performed_by: row.performed_by as string,
    timestamp: row.timestamp as string,
    notes: (row.notes as string) || undefined,
  };
}

// ─── Issues ─────────────────────────────────────────────────────────────────

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

export async function dsGetIssues(params: IssueListParams): Promise<DBResponse<Issue[]>> {
  const db = getSupabaseAdmin();
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Hitung total count dulu
  let countQuery = db.from('issues').select('*', { count: 'exact', head: true });
  let dataQuery = db
    .from('issues')
    .select('*')
    .range(from, to);

  // Sort
  const sortField = params.sort ?? 'updated_at';
  const sortAsc = (params.order ?? 'desc') === 'asc';
  dataQuery = dataQuery.order(sortField, { ascending: sortAsc, nullsFirst: false });

  // Filters
  if (params.created_by) {
    countQuery = countQuery.eq('created_by', params.created_by);
    dataQuery = dataQuery.eq('created_by', params.created_by);
  }
  if (params.status && params.status !== 'ALL') {
    countQuery = countQuery.eq('status', params.status);
    dataQuery = dataQuery.eq('status', params.status);
  }
  if (params.kategori && params.kategori !== 'ALL') {
    countQuery = countQuery.eq('kategori_issue', params.kategori);
    dataQuery = dataQuery.eq('kategori_issue', params.kategori);
  }
  if (params.date_from) {
    countQuery = countQuery.gte('created_at', params.date_from);
    dataQuery = dataQuery.gte('created_at', params.date_from);
  }
  if (params.date_to) {
    // Sampai akhir hari
    const toDate = params.date_to + 'T23:59:59Z';
    countQuery = countQuery.lte('created_at', toDate);
    dataQuery = dataQuery.lte('created_at', toDate);
  }
  if (params.sku) {
    countQuery = countQuery.ilike('sku', `%${params.sku}%`);
    dataQuery = dataQuery.ilike('sku', `%${params.sku}%`);
  }
  if (params.hu) {
    countQuery = countQuery.ilike('hu', `%${params.hu}%`);
    dataQuery = dataQuery.ilike('hu', `%${params.hu}%`);
  }
  if (params.search) {
    const sanitized = params.search.replace(/[(),]/g, ' ').trim();
    const q = `%${sanitized}%`;
    // Optimasi pencarian: Jika multi-kata, picu Plain Full Text Search (.plfts) pada nama_barang
    // guna memanfaatkan indeks GIN, jika satu kata gunakan ilike parsial standar.
    const namaBarangFilter = sanitized.includes(' ')
      ? `nama_barang.plfts.${sanitized}`
      : `nama_barang.ilike.${q}`;
    const searchFilter = `sku.ilike.${q},${namaBarangFilter},issue_id.ilike.${q},hu.ilike.${q},do_number.ilike.${q}`;
    countQuery = countQuery.or(searchFilter);
    dataQuery = dataQuery.or(searchFilter);
  }

  const [{ count, error: countErr }, { data, error }] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  if (error || countErr) {
    console.error('[dsGetIssues]', error ?? countErr);
    return { success: false, error: { code: 'DB_ERROR', message: (error ?? countErr)!.message } };
  }

  const total = count ?? 0;
  return {
    success: true,
    data: (data ?? []).map((r) => rowToIssue(r as Record<string, unknown>)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function dsGetIssueById(id: string): Promise<DBResponse<Issue>> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('issues').select('*').eq('issue_id', id).single();
  if (error || !data) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  }
  return { success: true, data: rowToIssue(data as Record<string, unknown>) };
}

export async function dsCheckDuplicateIssue(
  sku: string, batch: string, exclude_id?: string
): Promise<{ isDuplicate: boolean; existing_id: string | null; existing_issue: Issue | null }> {
  const db = getSupabaseAdmin();
  let query = db
    .from('issues')
    .select('*')
    .eq('sku', sku)
    .eq('batch', batch)
    .eq('status', 'OPEN')
    .limit(1);
  if (exclude_id) query = query.neq('issue_id', exclude_id);

  const { data } = await query;
  const dup = data?.[0] ?? null;
  return { 
    isDuplicate: !!dup, 
    existing_id: dup ? (dup as any).issue_id : null,
    existing_issue: dup ? rowToIssue(dup as Record<string, unknown>) : null 
  };
}

export async function dsCreateIssue(
  data: Partial<Issue> & { performed_by?: string }
): Promise<DBResponse<Issue>> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const issue_id = generateIssueId();

  const row = {
    issue_id,
    hu: data.hu ?? null,
    do_number: data.do_number ?? null,
    sku: data.sku ?? null,
    nama_barang: data.nama_barang!,
    batch: data.batch ?? null,
    qty_system_pcs: data.qty_system_pcs ?? 0,
    qty_fisik_pcs: data.qty_fisik_pcs ?? 0,
    selisih_pcs: (data.qty_fisik_pcs ?? 0) - (data.qty_system_pcs ?? 0),
    kategori_issue: data.kategori_issue!,
    keterangan: data.keterangan ?? null,
    photo_url: data.photo_url ?? null,
    status: 'OPEN',
    created_by: data.created_by!,
    created_by_name: data.created_by_name ?? null,
    created_at: data.created_at ?? now,
    updated_at: data.created_at ?? now,
    input_source: data.input_source ?? 'WEB',
  };

  const { data: inserted, error } = await db.from('issues').insert(row).select('*').single();
  if (error || !inserted) {
    console.error('[dsCreateIssue]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error?.message ?? 'Gagal membuat issue' } };
  }

  await dsAddLog({
    reference_id: issue_id,
    reference_type: 'ISSUE',
    action: 'issue_created',
    performed_by: data.performed_by ?? data.created_by!,
    notes: 'Issue baru dibuat',
  });

  return { success: true, data: rowToIssue(inserted as Record<string, unknown>), message: 'Issue berhasil dibuat' };
}

export async function dsUpdateIssue(
  id: string, data: Partial<Issue> & { performed_by?: string }
): Promise<DBResponse<Issue>> {
  const db = getSupabaseAdmin();
  const { performed_by, ...fields } = data;
  const updateFields = { ...fields, updated_at: new Date().toISOString() };

  const { error } = await db.from('issues').update(updateFields).eq('issue_id', id);
  if (error) {
    console.error('[dsUpdateIssue]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  const fresh = await dsGetIssueById(id);
  return fresh.success
    ? { success: true, data: fresh.data, message: 'Issue berhasil diperbarui' }
    : fresh;
}

export async function dsSolveIssue(
  id: string,
  data: { solved_by: string; storage_tujuan?: string; catatan?: string; performed_by?: string }
): Promise<DBResponse<Issue>> {
  const now = new Date().toISOString();
  const result = await dsUpdateIssue(id, {
    status: 'SOLVED',
    storage_tujuan: data.storage_tujuan ?? '',
    solved_by: data.solved_by,
    solved_at: now,
    solved_by_name: data.solved_by,
    performed_by: data.performed_by,
  });
  if (result.success) {
    await dsAddLog({
      reference_id: id,
      reference_type: 'ISSUE',
      action: 'issue_solved',
      performed_by: data.performed_by ?? data.solved_by,
      notes: data.catatan ?? 'Issue diselesaikan',
    });
  }
  return result;
}

export async function dsCancelIssue(
  id: string,
  data: { cancelled_by: string; alasan?: string; performed_by?: string }
): Promise<DBResponse<Issue>> {
  const now = new Date().toISOString();
  const result = await dsUpdateIssue(id, {
    status: 'CANCELLED',
    cancelled_by: data.cancelled_by,
    cancelled_at: now,
    cancelled_by_name: data.cancelled_by,
    performed_by: data.performed_by,
  });
  if (result.success) {
    await dsAddLog({
      reference_id: id,
      reference_type: 'ISSUE',
      action: 'issue_cancelled',
      performed_by: data.performed_by ?? data.cancelled_by,
      notes: data.alasan ?? 'Issue dibatalkan',
    });
  }
  return result;
}

export async function dsRequestSolved(
  id: string,
  data: { req_solved_by: string; req_solved_reason?: string; performed_by?: string }
): Promise<DBResponse<Issue>> {
  const now = new Date().toISOString();
  const result = await dsUpdateIssue(id, {
    status: 'WAITING_APPROVAL',
    req_solved_by: data.req_solved_by,
    req_solved_at: now,
    req_solved_reason: data.req_solved_reason ?? '',
    performed_by: data.performed_by,
  });
  if (result.success) {
    await dsAddLog({
      reference_id: id,
      reference_type: 'ISSUE',
      action: 'request_solved',
      performed_by: data.performed_by ?? data.req_solved_by,
      notes: data.req_solved_reason ?? 'Request solved diajukan',
    });
  }
  return result;
}

export async function dsRejectSolved(
  id: string,
  data: { reject_reason: string; rejected_by: string; performed_by?: string }
): Promise<DBResponse<Issue>> {
  const result = await dsUpdateIssue(id, {
    status: 'OPEN',
    reject_reason: data.reject_reason,
    req_solved_by: undefined,
    req_solved_at: undefined,
    req_solved_reason: undefined,
    performed_by: data.performed_by,
  });
  if (result.success) {
    await dsAddLog({
      reference_id: id,
      reference_type: 'ISSUE',
      action: 'reject_solved',
      performed_by: data.performed_by ?? data.rejected_by,
      notes: `Request ditolak: ${data.reject_reason}`,
    });
  }
  return result;
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
): Promise<DBResponse<Issue>> {
  const issueRes = await dsGetIssueById(id);
  if (!issueRes.success || !issueRes.data) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } };
  }
  const existing = issueRes.data;

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

  const result = await dsUpdateIssue(id, {
    remaining_selisih_pcs: newRemaining,
    merge_history: JSON.stringify(newHistory),
    merge_count: (existing.merge_count ?? 0) + 1,
    updated_by: data.by,
    performed_by: data.performed_by,
  });

  if (result.success) {
    await dsAddLog({
      reference_id: id,
      reference_type: 'ISSUE',
      action: 'issue_merged',
      performed_by: data.performed_by ?? data.by,
      notes: `Merge +${data.new_selisih} PCS. Remaining: ${newRemaining}`,
    });
  }

  return {
    ...result,
    message: 'Merge berhasil',
    ...(newRemaining === 0 ? { balanced: true } as Record<string, unknown> : {}),
  };
}

// ─── CZ ─────────────────────────────────────────────────────────────────────

export async function dsGetCZ(params: {
  user_id?: string;
  user_id_alt?: string;
  username?: string;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}): Promise<DBResponse<CZRecord[]>> {
  const db = getSupabaseAdmin();
  let query = db.from('cz_records').select('*').order('created_at', { ascending: false });

  if (params.user_id || params.username) {
    // Filter by nama (created_by field stores nama)
    const nameFilter = params.user_id;
    if (nameFilter) query = query.eq('created_by', nameFilter);
  }
  if (params.status && params.status !== 'ALL') {
    query = query.eq('status', params.status);
  }
  if (params.date_from) {
    query = query.gte('created_at', params.date_from);
  }
  if (params.date_to) {
    query = query.lte('created_at', params.date_to + 'T23:59:59Z');
  }
  if (params.search) {
    const sanitized = params.search.replace(/[(),]/g, ' ').trim();
    const q = `%${sanitized}%`;
    // Optimasi pencarian: Picu Plain Full Text Search (.plfts) pada nama_barang jika berupa multi-kata
    const namaBarangFilter = sanitized.includes(' ')
      ? `nama_barang.plfts.${sanitized}`
      : `nama_barang.ilike.${q}`;
    query = query.or(`sku.ilike.${q},${namaBarangFilter},cz_id.ilike.${q},hu.ilike.${q},do_number.ilike.${q}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[dsGetCZ]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  const records = (data ?? []).map((r) => rowToCZ(r as Record<string, unknown>));
  return { success: true, data: records, total: records.length };
}

export async function dsGetCZById(id: string): Promise<DBResponse<CZRecord>> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('cz_records').select('*').eq('cz_id', id).single();
  if (error || !data) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } };
  }
  return { success: true, data: rowToCZ(data as Record<string, unknown>) };
}

export async function dsCheckDuplicateCZ(
  sku: string, batch?: string, exclude_id?: string
): Promise<{ isDuplicate: boolean; existing_id: string | null }> {
  const db = getSupabaseAdmin();
  let query = db
    .from('cz_records')
    .select('cz_id')
    .eq('sku', sku)
    .eq('status', 'OPEN')
    .limit(1);
  if (exclude_id) query = query.neq('cz_id', exclude_id);

  const { data } = await query;
  const dup = data?.[0] ?? null;
  return { isDuplicate: !!dup, existing_id: dup ? (dup as any).cz_id : null };
}

export async function dsCreateCZ(
  data: Partial<CZRecord> & { performed_by?: string }
): Promise<DBResponse<CZRecord>> {
  const db = getSupabaseAdmin();
  const cz_id = generateCZId();

  const row = {
    cz_id,
    hu: data.hu ?? null,
    do_number: data.do_number ?? null,
    sku: data.sku!,
    nama_barang: data.nama_barang!,
    batch: data.batch!,
    qty_pcs: data.qty_pcs ?? 0,
    keterangan: data.keterangan ?? null,
    status: 'OPEN',
    created_by: data.created_by!,
    created_by_name: data.created_by_name ?? null,
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error } = await db.from('cz_records').insert(row).select('*').single();
  if (error || !inserted) {
    console.error('[dsCreateCZ]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error?.message ?? 'Gagal membuat CZ' } };
  }

  await dsAddLog({
    reference_id: cz_id,
    reference_type: 'CZ',
    action: 'cz_created',
    performed_by: data.performed_by ?? data.created_by!,
    notes: 'CZ record baru dibuat',
  });

  return { success: true, data: rowToCZ(inserted as Record<string, unknown>), message: 'CZ record berhasil dibuat' };
}

export async function dsSolveCZ(
  id: string,
  data: { solved_by: string; storage_tujuan: string; catatan_penyelesaian?: string; performed_by?: string }
): Promise<DBResponse<CZRecord>> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await db.from('cz_records').update({
    status: 'SOLVED',
    storage_tujuan: data.storage_tujuan,
    catatan_penyelesaian: data.catatan_penyelesaian ?? null,
    solved_by: data.solved_by,
    solved_at: now,
    solved_by_name: data.solved_by,
  }).eq('cz_id', id);

  if (error) {
    console.error('[dsSolveCZ]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  await dsAddLog({
    reference_id: id,
    reference_type: 'CZ',
    action: 'cz_solved',
    performed_by: data.performed_by ?? data.solved_by,
    notes: `CZ diselesaikan ke ${data.storage_tujuan}`,
  });

  const fresh = await dsGetCZById(id);
  return fresh.success
    ? { ...fresh, message: 'CZ record berhasil diselesaikan' }
    : fresh;
}

export async function dsUpdateCZ(
  id: string, data: Partial<CZRecord> & { performed_by?: string }
): Promise<DBResponse<CZRecord>> {
  const db = getSupabaseAdmin();
  const { performed_by, ...fields } = data;

  const { error } = await db.from('cz_records').update(fields).eq('cz_id', id);
  if (error) {
    console.error('[dsUpdateCZ]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  await dsAddLog({
    reference_id: id,
    reference_type: 'CZ',
    action: 'cz_edited',
    performed_by: performed_by ?? 'system',
    notes: 'CZ record diperbarui',
  });

  const fresh = await dsGetCZById(id);
  return fresh.success
    ? { ...fresh, message: 'CZ record berhasil diperbarui' }
    : fresh;
}

export async function dsDeleteCZ(
  id: string, performed_by: string
): Promise<DBResponse<void>> {
  const db = getSupabaseAdmin();
  const { error } = await db.from('cz_records').delete().eq('cz_id', id);
  if (error) {
    console.error('[dsDeleteCZ]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  await dsAddLog({
    reference_id: id,
    reference_type: 'CZ',
    action: 'cz_deleted',
    performed_by,
    notes: 'CZ record dihapus',
  });

  return { success: true, message: 'CZ record berhasil dihapus' };
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function dsGetUsers(params?: { search?: string }): Promise<DBResponse<User[]>> {
  const db = getSupabaseAdmin();
  let query = db
    .from('users')
    .select('user_id, nama, username, email, role, status, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (params?.search) {
    const sanitized = params.search.replace(/[(),]/g, ' ').trim();
    const q = `%${sanitized}%`;
    query = query.or(`nama.ilike.${q},username.ilike.${q}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[dsGetUsers]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  const users = (data ?? []).map((r) => rowToUser(r as Record<string, unknown>));
  return { success: true, data: users, total: users.length };
}

export async function dsGetUserById(id: string): Promise<DBResponse<User>> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('users')
    .select('user_id, nama, username, email, role, status, created_at, updated_at')
    .eq('user_id', id)
    .single();
  if (error || !data) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  }
  return { success: true, data: rowToUser(data as Record<string, unknown>) };
}

export async function dsGetUserForAuth(username: string): Promise<{ user: User; pin_hash: string } | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();

  if (error || !data || !data.pin_hash) return null;

  const user = rowToUser(data as Record<string, unknown>);
  return { user, pin_hash: data.pin_hash as string };
}

export async function dsGetAdminForAuth(email: string): Promise<{ user: User; password_hash: string } | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('role', 'ADMIN')
    .single();

  if (error || !data || !data.password_hash) return null;

  const user = rowToUser(data as Record<string, unknown>);
  return { user, password_hash: data.password_hash as string };
}

export async function dsCreateUser(
  data: Partial<User> & { pin_hash: string; performed_by?: string }
): Promise<DBResponse<User>> {
  const db = getSupabaseAdmin();

  // Cek duplicate username
  const { data: existing } = await db
    .from('users')
    .select('user_id')
    .eq('username', data.username!)
    .single();
  if (existing) {
    return { success: false, error: { code: 'DUPLICATE_USERNAME', message: 'Username sudah digunakan' } };
  }

  const user_id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const row = {
    user_id,
    nama: data.nama!,
    username: data.username!.toLowerCase(),
    email: data.email ?? null,
    pin_hash: data.pin_hash,
    password_hash: null,
    role: data.role ?? 'USER',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error } = await db.from('users').insert(row).select(
    'user_id, nama, username, email, role, status, created_at, updated_at'
  ).single();

  if (error || !inserted) {
    console.error('[dsCreateUser]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error?.message ?? 'Gagal membuat user' } };
  }

  await dsAddLog({
    reference_id: user_id,
    reference_type: 'USER',
    action: 'user_created',
    performed_by: data.performed_by ?? 'admin',
    notes: `User ${data.username} berhasil ditambahkan`,
  });

  return { success: true, data: rowToUser(inserted as Record<string, unknown>), message: 'User berhasil ditambahkan' };
}

export async function dsResetPin(
  id: string, data: { pin_hash: string; performed_by?: string }
): Promise<DBResponse<null>> {
  const db = getSupabaseAdmin();

  // Ambil username dulu untuk log
  const { data: userRow } = await db.from('users').select('username').eq('user_id', id).single();

  const { error } = await db.from('users').update({
    pin_hash: data.pin_hash,
    updated_at: new Date().toISOString(),
  }).eq('user_id', id);

  if (error) {
    console.error('[dsResetPin]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  await dsAddLog({
    reference_id: id,
    reference_type: 'USER',
    action: 'pin_reset',
    performed_by: data.performed_by ?? 'admin',
    notes: `PIN user ${(userRow as any)?.username ?? id} direset`,
  });

  return { success: true, data: null, message: 'PIN berhasil direset' };
}

export async function dsToggleStatus(
  id: string, data: { performed_by?: string }
): Promise<DBResponse<null>> {
  const db = getSupabaseAdmin();

  // Ambil status saat ini
  const { data: userRow, error: fetchErr } = await db
    .from('users')
    .select('status, username')
    .eq('user_id', id)
    .single();

  if (fetchErr || !userRow) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } };
  }

  const currentStatus = (userRow as any).status as string;
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  const { error } = await db.from('users').update({
    status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq('user_id', id);

  if (error) {
    console.error('[dsToggleStatus]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  await dsAddLog({
    reference_id: id,
    reference_type: 'USER',
    action: newStatus === 'ACTIVE' ? 'user_reactivated' : 'user_deactivated',
    performed_by: data.performed_by ?? 'admin',
    notes: `Status diubah ke ${newStatus}`,
  });

  return {
    success: true,
    data: null,
    message: `User berhasil di-${newStatus === 'ACTIVE' ? 'aktifkan' : 'nonaktifkan'}`,
  };
}

// ─── Dashboard & Logs ────────────────────────────────────────────────────────

export async function dsGetDashboard(): Promise<DBResponse<{ summary: unknown; recent_activity: ActivityLog[] }>> {
  const db = getSupabaseAdmin();
  const today = new Date().toISOString().split('T')[0];

  // Paralel query untuk semua count
  const [
    { count: openCount },
    { count: waitingCount },
    { count: solvedCount },
    { count: cancelledCount },
    { count: todayCount },
    { count: czOpenCount },
    { count: czSolvedCount },
    { data: recentLogs },
  ] = await Promise.all([
    db.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
    db.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'WAITING_APPROVAL'),
    db.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'SOLVED'),
    db.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'CANCELLED'),
    db.from('issues').select('*', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00Z').lte('created_at', today + 'T23:59:59Z'),
    db.from('cz_records').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
    db.from('cz_records').select('*', { count: 'exact', head: true }).eq('status', 'SOLVED'),
    db.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(10),
  ]);

  return {
    success: true,
    data: {
      summary: {
        open: openCount ?? 0,
        waiting_approval: waitingCount ?? 0,
        solved: solvedCount ?? 0,
        cancelled: cancelledCount ?? 0,
        today: todayCount ?? 0,
        cz_open: czOpenCount ?? 0,
        cz_solved: czSolvedCount ?? 0,
      },
      recent_activity: (recentLogs ?? []).map((r) => rowToLog(r as Record<string, unknown>)),
    },
  };
}

export async function dsGetLogs(params?: {
  limit?: number;
  reference_id?: string;
  reference_type?: string;
}): Promise<DBResponse<ActivityLog[]>> {
  const db = getSupabaseAdmin();
  let query = db
    .from('activity_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(params?.limit ?? 10);

  if (params?.reference_id) query = query.eq('reference_id', params.reference_id);
  if (params?.reference_type) query = query.eq('reference_type', params.reference_type);

  const { data, error } = await query;
  if (error) {
    console.error('[dsGetLogs]', error);
    return { success: false, error: { code: 'DB_ERROR', message: error.message } };
  }

  const logs = (data ?? []).map((r) => rowToLog(r as Record<string, unknown>));
  return { success: true, data: logs, total: logs.length };
}

export async function dsAddLog(data: {
  reference_id: string;
  reference_type: string;
  action: string;
  performed_by: string;
  notes?: string;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const log_id = generateLogId();

  await db.from('activity_logs').insert({
    log_id,
    reference_id: data.reference_id,
    reference_type: data.reference_type,
    action: data.action,
    performed_by: data.performed_by,
    timestamp: new Date().toISOString(),
    notes: data.notes ?? null,
  });
}

// ─── Legacy mock fallback exports (dipakai oleh beberapa tempat) ─────────────

// Tidak digunakan lagi tapi diexport agar tidak ada import error
export { mock };
