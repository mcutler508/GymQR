import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { ThemePicker } from './ThemePicker';
import { TimezoneEditor } from './TimezoneEditor';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';

export const dynamic = 'force-dynamic';

export default async function BrandingPage() {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, theme, timezone')
    .eq('owner_id', userData.user.id)
    .maybeSingle<{ id: string; name: string; theme: GymTheme; timezone: string }>();

  if (!gym) redirect('/owner');

  return (
    <div>
      <header className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Branding and timezone for {gym.name}.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Theme</h2>
        <p className="text-sm text-neutral-400 mb-4">
          Picks the visual style your members see when they scan a sticker. Changes save instantly.
        </p>
        <ThemePicker currentTheme={gym.theme} gymName={gym.name} />
      </section>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Timezone</h2>
        <p className="text-sm text-neutral-400 mb-4">
          Used to compute &ldquo;Today&rdquo; on your dashboard and to group member workouts by the
          correct calendar day. Set this to your gym&rsquo;s local time.
        </p>
        <TimezoneEditor currentTimezone={gym.timezone} />
      </section>
    </div>
  );
}
