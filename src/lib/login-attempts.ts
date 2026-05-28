/**
 * In-memory login attempt tracker
 * Tracks failed login attempts per username and implements lockout
 * Per PRD: 5 failed attempts → lock for 15 minutes
 */

import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES } from '@/lib/constants';

interface AttemptRecord {
  count: number;
  lockedUntil: Date | null;
  lastAttempt: Date;
}

const attempts: Map<string, AttemptRecord> = new Map();

/**
 * Check whether a username is currently locked out
 */
export function isLocked(username: string): boolean {
  const record = attempts.get(username.toLowerCase());
  if (!record) return false;
  if (!record.lockedUntil) return false;

  if (new Date() > record.lockedUntil) {
    // Lock expired — clean up
    attempts.delete(username.toLowerCase());
    return false;
  }
  return true;
}

/**
 * Get minutes remaining until lockout expires (0 if not locked)
 */
export function lockRemainingMinutes(username: string): number {
  const record = attempts.get(username.toLowerCase());
  if (!record?.lockedUntil) return 0;
  const remaining = record.lockedUntil.getTime() - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

/**
 * Record a failed login attempt. Returns true if now locked.
 */
export function recordFailedAttempt(username: string): boolean {
  const key = username.toLowerCase();
  const record = attempts.get(key) ?? { count: 0, lockedUntil: null, lastAttempt: new Date() };

  record.count += 1;
  record.lastAttempt = new Date();

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);
    record.lockedUntil = lockedUntil;
  }

  attempts.set(key, record);
  return record.count >= MAX_LOGIN_ATTEMPTS;
}

/**
 * Get current attempt count for a username
 */
export function getAttemptCount(username: string): number {
  return attempts.get(username.toLowerCase())?.count ?? 0;
}

/**
 * Clear attempts after successful login
 */
export function clearAttempts(username: string): void {
  attempts.delete(username.toLowerCase());
}
