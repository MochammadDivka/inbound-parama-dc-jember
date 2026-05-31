import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Hanya warn di client browser agar tidak crash
  if (typeof window !== 'undefined') {
    console.warn('[supabase-browser] NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum dikonfigurasi');
  }
}

export const supabaseBrowser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
