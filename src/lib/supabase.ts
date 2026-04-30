import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton: env vars aren't required at module load (so `next build` works
// before .env.local exists), only when something actually queries.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.',
    );
  }
  client = createClient(url, anonKey, { auth: { persistSession: false } });
  return client;
}

// Proxy that forwards every property access to a lazily-created client. This
// lets call sites keep using `supabase.from(...)` while deferring the env-var
// check to the first actual call.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export type Equipment = {
  id: string;
  qr_slug: string;
  name: string;
  machine_label: string | null;
  gym_name: string | null;
  status: 'active' | 'inactive';
};

export type Set = {
  id: string;
  user_id: string;
  equipment_id: string;
  weight: number;
  reps: number;
  rpe: number | null;
  note: string | null;
  logged_at: string;
};
