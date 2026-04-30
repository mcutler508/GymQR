import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client bound to the current request's cookies.
 * Use this for owner-side routes — it respects the Supabase Auth session
 * stored in cookies, so `auth.uid()` is set in RLS policies.
 *
 * Member-side queries that don't depend on auth (anon-key writes via
 * permissive RLS) keep using the bare anon-key client from `./supabase`.
 */
export async function getServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Reading-only contexts (server components outside actions) can't set
          // cookies — middleware handles refresh in that case.
        }
      },
    },
  });
}
