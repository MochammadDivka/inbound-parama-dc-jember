/**
 * bcrypt helpers for PIN and password hashing
 * Uses bcryptjs (pure JS, no native dependencies)
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a PIN or password
 */
export async function hashSecret(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plain text PIN/password against a stored hash
 */
export async function compareSecret(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Synchronous hash (for seeding mock data only — do NOT use in API handlers)
 */
export function hashSecretSync(plain: string): string {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

/**
 * Synchronous compare (for seeding mock data only)
 */
export function compareSecretSync(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}
