import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * One admin check, accepting either the password header or a session cookie.
 *
 * The header path stays because scripts and curl use it. The cookie exists so
 * the password is typed once rather than on every page and after every refresh
 * - it is HttpOnly, so unlike sessionStorage a page script cannot read it back.
 */

const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? '');

export const ADMIN_COOKIE = 'mifotra_admin';
const TTL_HOURS = 8;

/** Constant-time compare that tolerates a missing or wrong-length input. */
export function passwordMatches(given: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected || !given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function signAdmin(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(secret);
}

async function cookieValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.admin === true;
  } catch {
    return false;
  }
}

/** True when the request carries either a valid password header or a live session. */
export async function isAdmin(req: Request): Promise<boolean> {
  if (passwordMatches(req.headers.get('x-admin-password'))) return true;
  return cookieValid((await cookies()).get(ADMIN_COOKIE)?.value);
}

/**
 * `Secure` has to follow the actual scheme, not NODE_ENV. `npm run start` runs
 * a production build over plain http on localhost, and a Secure cookie is never
 * sent back over http - so keying off NODE_ENV locks you out of your own admin
 * panel whenever you test a production build locally.
 */
export function isHttps(req: Request): boolean {
  const forwarded = req.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function cookieOptions(req: Request) {
  return {
    httpOnly: true,
    secure: isHttps(req),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TTL_HOURS * 60 * 60,
  };
}
