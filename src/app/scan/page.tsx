import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { Scanner } from './Scanner';
import type { GymTheme } from './[qrSlug]/page';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

export default async function ScanRootPage() {
  // Theme follows the member's gym so the viewfinder matches the rest of
  // their experience. Falls back to halogen for first-time scanners (no
  // cookie yet, so no gym_id to resolve).
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  let theme: GymTheme = 'halogen';
  if (memberId) {
    const { data } = await supabase
      .from('members')
      .select('gym_id, gyms(theme)')
      .eq('id', memberId)
      .maybeSingle<{ gym_id: string; gyms: { theme: GymTheme } | null }>();
    if (data?.gyms?.theme) theme = data.gyms.theme;
  }

  return (
    <div data-theme={theme} className="min-h-screen bg-canvas text-ink">
      <Scanner />
    </div>
  );
}
