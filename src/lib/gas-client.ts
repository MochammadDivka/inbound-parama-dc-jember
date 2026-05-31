/**
 * GAS Client — DEPRECATED
 * ========================
 * Backend telah dimigrasikan ke Supabase PostgreSQL.
 * File ini dipertahankan hanya untuk kompatibilitas import yang mungkin masih ada.
 *
 * Untuk upload foto, sekarang menggunakan Google Drive API langsung via googleapis.
 * Lihat: src/app/api/upload/photo/route.ts
 */

// isGASEnabled selalu false — tidak ada GAS lagi
export const isGASEnabled = false;

export async function gasRequest<T = unknown>(
  _options: unknown
): Promise<{ success: boolean; data?: T; error?: { code: string; message: string } }> {
  console.warn('[gas-client] gasRequest dipanggil tapi GAS sudah tidak digunakan. Migrasi ke Supabase sudah selesai.');
  return {
    success: false,
    error: { code: 'GAS_DISABLED', message: 'GAS sudah tidak digunakan. Backend sekarang menggunakan Supabase.' },
  };
}

export const gas = new Proxy({} as Record<string, (...args: unknown[]) => Promise<unknown>>, {
  get: (_, prop) => () => {
    console.warn(`[gas-client] gas.${String(prop)} dipanggil tapi GAS sudah tidak digunakan.`);
    return Promise.resolve({
      success: false,
      error: { code: 'GAS_DISABLED', message: 'Backend sekarang menggunakan Supabase.' },
    });
  },
});
