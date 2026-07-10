import { cookies } from 'next/headers';

export const MEMBER_COOKIE = 'reptag_member_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Server-side helper: bind the member identity cookie.
 *
 * `httpOnly: true` — no client code needs to read this; identity mirrors into
 * localStorage separately for cross-tab display bits (name). Keeping the auth
 * cookie out of `document.cookie` blocks XSS from lifting a session.
 */
export async function setMemberCookie(memberId: string): Promise<void> {
  const store = await cookies();
  store.set(MEMBER_COOKIE, memberId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR,
    path: '/',
  });
}

export async function clearMemberCookie(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_COOKIE);
}

export async function readMemberCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(MEMBER_COOKIE)?.value ?? null;
}
