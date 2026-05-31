/**
 * Supabase Client
 * ===================================================
 * Menggunakan SERVICE_ROLE_KEY (server-only) untuk bypass RLS.
 * JANGAN import file ini di client components / browser code.
 *
 * Gunakan `supabaseAdmin` untuk semua operasi server-side.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Warn pada startup tapi jangan crash — akan error saat runtime jika benar-benar dipakai
  if (typeof window === 'undefined') {
    console.warn('[supabase] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di .env.local');
  }
}

// Singleton pattern — satu instance per process
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

export const isSupabaseEnabled = !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;
