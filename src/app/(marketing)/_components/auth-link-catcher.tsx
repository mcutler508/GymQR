'use client';

import { useEffect } from 'react';

/**
 * Supabase sends auth email links to the project's Site URL (this landing
 * page) when the requested redirect isn't allow-listed, or when the email was
 * sent from the dashboard. Forward those to the owner reset flow instead of
 * silently showing the marketing page.
 */
export function AuthLinkCatcher() {
  useEffect(() => {
    const { hash, search } = window.location;
    const hashParams = new URLSearchParams(hash.slice(1));
    const code = new URLSearchParams(search).get('code');

    if (hashParams.get('type') === 'recovery' && hashParams.get('access_token')) {
      window.location.replace(`/owner/reset-password${hash}`);
    } else if (hashParams.get('error_code')) {
      window.location.replace('/owner/forgot-password?expired=1');
    } else if (code) {
      // Owners have email confirmation off, so the only emailed code is recovery.
      window.location.replace(
        `/owner/auth/confirm?code=${encodeURIComponent(code)}&next=/owner/reset-password`,
      );
    }
  }, []);

  return null;
}
