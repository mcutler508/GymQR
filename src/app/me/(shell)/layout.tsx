import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MemberBottomNav } from '../_components/MemberBottomNav';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

/**
 * Authenticated shell for the member persona — dashboard, stats overview,
 * history, profile. Owns: cookie gate, theme application, sticky brand header,
 * fixed bottom tab nav, bottom safe-area padding.
 *
 * Out-of-shell pages (kept standalone on purpose): `/me/stats/[equipmentId]`
 * (deep machine view with its own polished chrome), `/scan/[qrSlug]` (the
 * scan-log loop, kept distraction-free).
 */
export default async function MemberShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)?.value;
  if (!memberId) redirect('/scan');

  const { data: member } = await supabase
    .from('members')
    .select('id, name, gym_id, gyms(name, theme, timezone)')
    .eq('id', memberId)
    .maybeSingle<{
      id: string;
      name: string;
      gym_id: string;
      gyms: { name: string; theme: GymTheme; timezone: string } | null;
    }>();

  if (!member) redirect('/scan');

  const theme: GymTheme = member.gyms?.theme ?? 'halogen';
  const gymName = member.gyms?.name ?? 'Gym';

  return (
    <div data-theme={theme} className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/me" className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/repetoIQicon.png"
              alt="RepetoIQ"
              width={32}
              height={32}
              priority
              className="h-8 w-8 shrink-0"
            />
            <span className="font-display text-sm tracking-tight text-ink truncate">{gymName}</span>
          </Link>
          <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
            {member.name}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6 pb-28">{children}</main>

      <MemberBottomNav />
    </div>
  );
}
