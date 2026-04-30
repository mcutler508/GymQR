import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerClient } from '@/lib/supabase-server';
import { signOutOwner } from '../actions';

export const dynamic = 'force-dynamic';

export default async function GatedOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name')
    .eq('owner_id', data.user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-900">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/owner" className="font-semibold tracking-tight">
              {gym?.name ?? 'RepTag'}
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-400">
              <Link href="/owner" className="hover:text-white">Dashboard</Link>
              <Link href="/owner/equipment" className="hover:text-white">Equipment</Link>
              <Link href="/owner/members" className="hover:text-white">Members</Link>
              <Link href="/owner/branding" className="hover:text-white">Branding</Link>
            </nav>
          </div>
          <form action={signOutOwner}>
            <button type="submit" className="text-sm text-neutral-400 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6">{children}</div>
    </div>
  );
}
