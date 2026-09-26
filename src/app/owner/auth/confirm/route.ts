import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Landing point for Supabase Auth email links (password recovery).
 * Handles both link shapes:
 *   - `?token_hash=…&type=recovery` — from a custom email template; works
 *     even when the link is opened on a different device/browser.
 *   - `?code=…` — PKCE flow from the default template; only works in the
 *     browser that requested the reset (the code verifier lives in a cookie).
 * On success the session cookie is set and we forward to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  const supabase = await getServerClient();
  let error: { message: string } | null = null;

  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = { message: 'missing token' };
  }

  if (error) {
    return NextResponse.redirect(`${origin}/owner/forgot-password?expired=1`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

/** Only allow same-site relative paths under /owner to prevent open redirects. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/owner') && !next.startsWith('//') ? next : '/owner';
}
