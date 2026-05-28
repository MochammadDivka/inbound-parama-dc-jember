// Types for Parama DC Jember / Parama Global Inspira application

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type IssueStatus = 'OPEN' | 'WAITING_APPROVAL' | 'SOLVED' | 'CANCELLED';
export type CZStatus = 'OPEN' | 'SOLVED';
export type InputSource = 'WEB' | 'MANUAL';
export type ReferenceType = 'ISSUE' | 'CZ' | 'USER';

export type IssueCategory =
  | 'Selisih Qty (Kurang)'
  | 'Selisih Qty (Lebih)'
  | 'Kerusakan Fisik'
  | 'Label Rusak / Tidak Terbaca'
  | 'HU Rusak'
  | 'Item Salah Penempatan'
  | 'Lainnya';

export interface User {
  user_id: string;
  nama: string;
  username: string;
  email?: string;
  pin_hash?: string;
  password_hash?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface MergeHistoryEntry {
  timestamp: string;
  action: 'initial' | 'merge' | 'request_solved' | 'approve_solved' | 'reject_solved' | 'request_rejected';
  selisih_added?: number;
  remaining?: number;
  by: string; // nama user
  keterangan?: string;
}

export interface Issue {
  issue_id: string;
  hu?: string;
  do_number?: string;
  sku?: string; // opsional untuk HU Rusak
  nama_barang: string;
  batch?: string; // opsional untuk HU Rusak
  qty_system_pcs: number;
  qty_fisik_pcs: number;
  selisih_pcs: number;
  remaining_selisih_pcs?: number; // kumulatif setelah merge
  merge_history?: string; // JSON string dari MergeHistoryEntry[]
  merge_count?: number;
  kategori_issue: IssueCategory;
  keterangan?: string;
  photo_url?: string;
  status: IssueStatus;
  storage_tujuan?: string;
  solved_by?: string; // nama user (bukan ID)
  solved_at?: string;
  cancelled_by?: string; // nama user (bukan ID)
  cancelled_at?: string;
  req_solved_by?: string; // nama user yang request solved
  req_solved_at?: string;
  req_solved_reason?: string;
  reject_reason?: string;
  created_by: string; // nama user (bukan ID)
  created_at: string;
  updated_by?: string; // nama user (bukan ID)
  updated_at?: string;
  input_source: InputSource;
  // Populated fields (backward compat)
  created_by_name?: string;
  solved_by_name?: string;
  cancelled_by_name?: string;
}

export interface CZRecord {
  cz_id: string;
  hu?: string;
  do_number?: string;
  sku: string;
  nama_barang: string;
  batch: string;
  qty_pcs: number;
  keterangan?: string;
  status: CZStatus;
  storage_tujuan?: string;
  catatan_penyelesaian?: string;
  created_by: string; // nama user (bukan ID)
  created_at: string;
  solved_by?: string; // nama user (bukan ID)
  solved_at?: string;
  // Populated (backward compat)
  created_by_name?: string;
  solved_by_name?: string;
}

export interface ActivityLog {
  log_id: string;
  reference_id: string;
  reference_type: ReferenceType;
  action: LogAction;
  performed_by: string; // nama user
  timestamp: string;
  notes?: string;
}

export type LogAction =
  | 'issue_created'
  | 'issue_edited'
  | 'issue_merged'
  | 'issue_solved'
  | 'issue_cancelled'
  | 'request_solved'
  | 'approve_solved'
  | 'reject_solved'
  | 'cz_created'
  | 'cz_edited'
  | 'cz_solved'
  | 'cz_deleted'
  | 'user_created'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'pin_reset'
  | 'login_success'
  | 'login_failed';

export interface DashboardSummary {
  open: number;
  waiting_approval: number;
  solved: number;
  cancelled: number;
  today: number;
  cz_open: number;
  cz_solved: number;
}

// Form types
export interface IssueFormData {
  hu?: string;
  do_number?: string;
  sku?: string;
  nama_barang: string;
  batch?: string;
  qty_system_pcs: number;
  qty_fisik_pcs: number;
  kategori_issue: IssueCategory;
  keterangan?: string;
  storage_tujuan?: string;
}

export interface CZFormData {
  hu?: string;
  do_number?: string;
  sku: string;
  nama_barang: string;
  batch: string;
  qty_pcs: number;
  keterangan?: string;
}

export interface SolveIssueData {
  storage_tujuan?: string;
  catatan?: string;
}

export interface CancelIssueData {
  alasan?: string;
}

export interface RequestSolvedData {
  alasan?: string;
}

export interface SolveCZData {
  storage_tujuan: string;
  catatan_penyelesaian?: string;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter types
export interface IssueFilter {
  search?: string;
  status?: IssueStatus | 'ALL';
  kategori?: IssueCategory | 'ALL';
  created_by?: string;
  date_from?: string;
  date_to?: string;
  hu?: string;
  sku?: string;
  mine?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Session extension
export interface SessionUser {
  id: string;
  name: string; // nama lengkap
  username?: string;
  email?: string;
  role: UserRole;
}
