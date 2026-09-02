import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';

const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? '');
export const SESSION_COOKIE = 'mifotra_access';

export type Session = { bankId: number; device: string };

/**
 * Codes are stored hashed. The plaintext is shown once at generation and never
 * persisted, so a database leak exposes nothing usable.
 */
export function hashCode(code: string): string {
  return createHash('sha256').update(normalizeCode(code)).digest('hex');
}

/** Accept whatever the buyer types: spacing, dashes and case are all ignored. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Ambiguous characters (0/O, 1/I) are excluded so codes survive being read aloud. */
export function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i % 4 === 3 && i < 11) out += '-';
  }
  return out;
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(secret);
}

export async function readSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.bankId !== 'number' || typeof payload.device !== 'string') return null;
    return { bankId: payload.bankId, device: payload.device };
  } catch {
    return null;
  }
}
