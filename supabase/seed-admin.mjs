/**
 * Script untuk generate bcrypt hash dan seed admin ke Supabase.
 * Jalankan: node supabase/seed-admin.mjs
 *
 * Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah diset di .env.local
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.error('Tidak bisa load .env.local');
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diset di .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_EMAIL = 'admin@parama-dc.com';
const ADMIN_PASSWORD = 'admin123';   // Ganti setelah pertama kali login!

async function main() {
  console.log('🔐  Generating bcrypt hash untuk admin password...');
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  console.log('🌱  Seeding admin ke Supabase...');
  const { data, error } = await supabase
    .from('users')
    .upsert({
      user_id: 'usr-admin-001',
      nama: 'Admin Parama',
      username: 'admin',
      email: ADMIN_EMAIL,
      password_hash,
      pin_hash: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('❌  Gagal seed admin:', error.message);
    process.exit(1);
  }

  console.log('✅  Admin berhasil di-seed ke Supabase!');
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('');
  console.log('⚠️   PENTING: Ganti password admin setelah login pertama kali!');
}

main();
