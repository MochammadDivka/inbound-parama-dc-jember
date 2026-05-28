/**
 * Zod validation schemas for Parama Global Inspira DC Jember API routes
 */
import { z } from 'zod';
import { OPTIONAL_SKU_BATCH_CATEGORIES, REQUIRED_BATCH_CATEGORIES } from '@/lib/constants';
import { IssueCategory } from '@/types';

// ─── Issue Schemas ─────────────────────────────────────────────────

export const issueCategorySchema = z.enum([
  'Selisih Qty (Kurang)',
  'Selisih Qty (Lebih)',
  'Kerusakan Fisik',
  'Label Rusak / Tidak Terbaca',
  'HU Rusak',
  'Item Salah Penempatan',
  'Lainnya',
]);

// Server-side batch normalization helper
const batchField = z
  .string()
  .max(100)
  .optional()
  .transform((val) => (val ? val.trim().toUpperCase() : val));

export const createIssueSchema = z
  .object({
    hu: z.string().max(100).optional().or(z.literal('')),
    do_number: z.string().max(100).optional().or(z.literal('')),
    // SKU & Batch: conditional required based on kategori
    sku: z.string().max(100).optional().or(z.literal('')),
    nama_barang: z.string().min(1, 'Nama barang wajib diisi').max(200),
    batch: batchField,
    qty_system_pcs: z
      .number({ invalid_type_error: 'Qty harus berupa angka' })
      .int('Qty harus bilangan bulat')
      .min(0, 'Qty tidak boleh negatif'),
    qty_fisik_pcs: z
      .number({ invalid_type_error: 'Qty harus berupa angka' })
      .int('Qty harus bilangan bulat')
      .min(0, 'Qty tidak boleh negatif'),
    kategori_issue: issueCategorySchema,
    keterangan: z.string().max(1000).optional().or(z.literal('')),
    storage_tujuan: z.string().max(100).optional().or(z.literal('')),
    created_at: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const kategori = data.kategori_issue as IssueCategory;
    const isOptionalSKU = OPTIONAL_SKU_BATCH_CATEGORIES.includes(kategori);
    const isBatchRequired = REQUIRED_BATCH_CATEGORIES.includes(kategori);

    // SKU wajib kecuali HU Rusak
    if (!isOptionalSKU && (!data.sku || data.sku.trim() === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SKU wajib diisi', path: ['sku'] });
    }

    // Batch wajib untuk kategori tertentu
    if (isBatchRequired && (!data.batch || data.batch.trim() === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Batch wajib diisi untuk kategori ini', path: ['batch'] });
    }
  });

export const editIssueSchema = z
  .object({
    hu: z.string().max(100).optional().or(z.literal('')),
    do_number: z.string().max(100).optional().or(z.literal('')),
    sku: z.string().max(100).optional().or(z.literal('')),
    nama_barang: z.string().min(1, 'Nama barang wajib diisi').max(200).optional(),
    batch: batchField,
    qty_system_pcs: z.number().int().min(0).optional(),
    qty_fisik_pcs: z.number().int().min(0).optional(),
    kategori_issue: issueCategorySchema.optional(),
    keterangan: z.string().max(1000).optional().or(z.literal('')),
    storage_tujuan: z.string().max(100).optional().or(z.literal('')),
  });

export const solveIssueSchema = z.object({
  action: z.literal('solve'),
  storage_tujuan: z.string().max(100).optional().or(z.literal('')),
  catatan: z.string().max(500).optional().or(z.literal('')),
});

export const cancelIssueSchema = z.object({
  action: z.literal('cancel'),
  alasan: z.string().max(500).optional().or(z.literal('')),
});

export const requestSolvedSchema = z.object({
  action: z.literal('request-solved'),
  alasan: z.string().max(500).optional().or(z.literal('')),
  req_solved_reason: z.string().max(500).optional().or(z.literal('')),
});

export const approveRejectSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reject_reason: z.string().min(1, 'Alasan penolakan wajib diisi').max(500) }),
]);

export const issueActionSchema = z.discriminatedUnion('action', [
  solveIssueSchema,
  cancelIssueSchema,
  requestSolvedSchema,
  z.object({ action: z.literal('approve'), storage_tujuan: z.string().max(100).optional().or(z.literal('')) }),
  z.object({ action: z.literal('reject'), reject_reason: z.string().min(1).max(500) }),
  z.object({ action: z.literal('update-photo'), photo_url: z.string().max(2000).optional().or(z.literal('')) }),
]);

// ─── CZ Schemas ───────────────────────────────────────────────────

export const createCZSchema = z.object({
  hu: z.string().max(100).optional().or(z.literal('')),
  do_number: z.string().max(100).optional().or(z.literal('')),
  sku: z.string().min(1, 'SKU wajib diisi').max(100),
  nama_barang: z.string().min(1, 'Nama barang wajib diisi').max(200),
  batch: z
    .string()
    .min(1, 'Batch wajib diisi')
    .max(100)
    .transform((val) => val.trim().toUpperCase()),
  qty_pcs: z
    .number({ invalid_type_error: 'Qty harus berupa angka' })
    .int('Qty harus bilangan bulat')
    .min(0, 'Qty tidak boleh negatif'),
  keterangan: z.string().max(1000).optional().or(z.literal('')),
});

export const solveCZSchema = z.object({
  storage_tujuan: z.string().min(1, 'Storage tujuan wajib diisi').max(100),
  catatan_penyelesaian: z.string().max(500).optional().or(z.literal('')),
});

// ─── User Schemas ──────────────────────────────────────────────────

export const createUserSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').max(100),
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(30, 'Username maksimal 30 karakter')
    .regex(/^[a-z0-9._-]+$/, 'Username hanya boleh huruf kecil, angka, titik, atau underscore')
    .transform((val) => val.toLowerCase()),
  pin: z
    .string()
    .length(6, 'PIN harus 6 digit')
    .regex(/^\d{6}$/, 'PIN hanya boleh angka'),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

export const resetPinSchema = z.object({
  action: z.literal('reset-pin'),
  new_pin: z
    .string()
    .length(6, 'PIN baru harus 6 digit')
    .regex(/^\d{6}$/, 'PIN hanya boleh angka'),
});

export const toggleStatusSchema = z.object({
  action: z.literal('toggle-status'),
});

export const userActionSchema = z.discriminatedUnion('action', [
  resetPinSchema,
  toggleStatusSchema,
]);

// ─── Auth Schemas ─────────────────────────────────────────────────

export const userLoginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  pin: z.string().length(6, 'PIN harus 6 digit'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

// ─── Type Exports ────────────────────────────────────────────────

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type EditIssueInput = z.infer<typeof editIssueSchema>;
export type IssueActionInput = z.infer<typeof issueActionSchema>;
export type CreateCZInput = z.infer<typeof createCZSchema>;
export type SolveCZInput = z.infer<typeof solveCZSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UserActionInput = z.infer<typeof userActionSchema>;
