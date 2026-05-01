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
    <div className="relative min-h-screen bg-black text-white">
      {/* Subtle film grain across the whole owner app for depth. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />
      {/* Top-of-page light gloss. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40vh]"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, rgb(255 255 255 / 0.05), transparent 70%)',
        }}
      />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-5">
          <div className="flex items-baseline gap-6">
            <Link href="/owner" className="group flex items-baseline gap-3">
              <span className="font-display text-xl tracking-tight">
                {gym?.name ?? 'RepTag'}
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:inline">
                Central Command
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-7 md:flex">
            <NavLink href="/owner">Dashboard</NavLink>
            <NavLink href="/owner/equipment">Equipment</NavLink>
            <NavLink href="/owner/members">Members</NavLink>
            <NavLink href="/owner/branding">Settings</NavLink>
          </nav>

          <form action={signOutOwner}>
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition-colors hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center gap-5 overflow-x-auto border-t border-white/10 px-6 py-3 md:hidden">
          <NavLink href="/owner">Dashboard</NavLink>
          <NavLink href="/owner/equipment">Equipment</NavLink>
          <NavLink href="/owner/members">Members</NavLink>
          <NavLink href="/owner/branding">Settings</NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:text-white"
    >
      {children}
      <span
        aria-hidden
        className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-300 group-hover:scale-x-100"
      />
    </Link>
  );
}
