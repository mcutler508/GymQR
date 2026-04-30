import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { ThemePicker } from './ThemePicker';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';

export const dynamic = 'force-dynamic';

export default async function BrandingPage() {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, theme')
    .eq('owner_id', userData.user.id)
    .maybeSingle<{ id: string; name: string; theme: GymTheme }>();

  if (!gym) redirect('/owner');

  return (
    <div>
      <header className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Pick the visual style your members see when they scan a sticker. Changes save instantly.
        </p>
      </header>
      <ThemePicker currentTheme={gym.theme} gymName={gym.name} />
    </div>
  );
}
