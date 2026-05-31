/**
 * Stateless login attempt tracker utilizing Supabase DB
 * Tracks failed login attempts per username and implements lockout
 * Per PRD: 5 failed attempts → lock for 15 minutes
 */

import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES } from '@/lib/constants';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Check whether a username is currently locked out
 */
export async function isLocked(username: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const key = username.toLowerCase().trim();
  
  const { data, error } = await db
    .from('login_attempts')
    .select('locked_until')
    .eq('username', key)
    .single();

  if (error || !data || !data.locked_until) return false;

  const lockedUntil = new Date(data.locked_until);
  if (new Date() > lockedUntil) {
    // Lock expired — clean up
    await db.from('login_attempts').delete().eq('username', key);
    return false;
  }
  return true;
}

/**
 * Get minutes remaining until lockout expires (0 if not locked)
 */
export async function lockRemainingMinutes(username: string): Promise<number> {
  const db = getSupabaseAdmin();
  const key = username.toLowerCase().trim();

  const { data, error } = await db
    .from('login_attempts')
    .select('locked_until')
    .eq('username', key)
    .single();

  if (error || !data || !data.locked_until) return 0;

  const lockedUntil = new Date(data.locked_until);
  const remaining = lockedUntil.getTime() - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

/**
 * Record a failed login attempt. Returns true if now locked.
 */
export async function recordFailedAttempt(username: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const key = username.toLowerCase().trim();
  const now = new Date().toISOString();

  // Get current attempts
  const { data } = await db
    .from('login_attempts')
    .select('attempts')
    .eq('username', key)
    .single();

  const currentAttempts = (data?.attempts ?? 0) + 1;
  let lockedUntil: string | null = null;

  if (currentAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockDate = new Date();
    lockDate.setMinutes(lockDate.getMinutes() + LOCK_DURATION_MINUTES);
    lockedUntil = lockDate.toISOString();
  }

  const { error } = await db.from('login_attempts').upsert({
    username: key,
    attempts: currentAttempts,
    locked_until: lockedUntil,
    last_attempt: now
  });

  if (error) {
    console.error('[recordFailedAttempt] Gagal menyimpan attempts:', error);
  }

  return currentAttempts >= MAX_LOGIN_ATTEMPTS;
}

/**
 * Get current attempt count for a username
 */
export async function getAttemptCount(username: string): Promise<number> {
  const db = getSupabaseAdmin();
  const key = username.toLowerCase().trim();

  const { data, error } = await db
    .from('login_attempts')
    .select('attempts')
    .eq('username', key)
    .single();

  if (error || !data) return 0;
  return data.attempts;
}

/**
 * Clear attempts after successful login
 */
export async function clearAttempts(username: string): Promise<void> {
  const db = getSupabaseAdmin();
  const key = username.toLowerCase().trim();

  await db.from('login_attempts').delete().eq('username', key);
}
