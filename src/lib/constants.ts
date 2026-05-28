import { IssueCategory, IssueStatus, CZStatus, UserRole, UserStatus } from '@/types';

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'Selisih Qty (Kurang)',
  'Selisih Qty (Lebih)',
  'Kerusakan Fisik',
  'Label Rusak / Tidak Terbaca',
  'HU Rusak',
  'Item Salah Penempatan',
  'Lainnya',
];

// Kategori yang tidak mewajibkan SKU & Batch
export const OPTIONAL_SKU_BATCH_CATEGORIES: IssueCategory[] = ['HU Rusak'];

// Kategori yang membutuhkan Batch wajib
export const REQUIRED_BATCH_CATEGORIES: IssueCategory[] = [
  'Selisih Qty (Kurang)',
  'Selisih Qty (Lebih)',
  'Item Salah Penempatan',
];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: 'Open',
  WAITING_APPROVAL: 'Menunggu Persetujuan',
  SOLVED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const ISSUE_STATUS_COLORS: Record<IssueStatus, string> = {
  OPEN: '#D97706',          // amber
  WAITING_APPROVAL: '#2563EB', // blue
  SOLVED: '#059669',        // green
  CANCELLED: '#DC2626',     // red
};

export const CZ_STATUS_LABELS: Record<CZStatus, string> = {
  OPEN: 'Open',
  SOLVED: 'Selesai',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Staff',
  ADMIN: 'Admin',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Tidak Aktif',
};

// Branding
export const APP_BRAND = 'Parama Global Inspira';
export const APP_SUBTITLE = 'Distribution Center · Jember';
export const APP_SHORT = 'PGI DC Jember';
export const APP_SYSTEM_NAME = 'Inbound Issue Tracker';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'PGI DC Jember';

export const SESSION_DURATION = 8 * 60 * 60; // 8 hours in seconds

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_SIZE_MB = 5;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const ITEMS_PER_PAGE = 20;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MINUTES = 15;
