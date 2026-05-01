import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { startOfTodayUtc, formatLocal } from '@/lib/timezone';
import { EditorialHeader } from '../_components/editorial-header';
import { StatCard } from '../_components/stat-card';
import { ActionCard } from '../_components/action-card';
import { MonoRule } from '../_components/mono-rule';

export const dynamic = 'force-dynamic';

export default async function OwnerDashboard() {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, slug, timezone')
    .eq('owner_id', userData.user.id)
    .maybeSingle<{ id: string; name: string; slug: string; timezone: string }>();

  if (!gym) {
    return (
      <div className="border-l-2 border-white/40 py-10 pl-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          Anomaly
        </div>
        <p className="mt-3 font-display text-2xl text-white">
          No gym is linked to this account.
        </p>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          This shouldn&rsquo;t happen after sign-up — contact support.
        </p>
      </div>
    );
  }

  const todayIso = startOfTodayUtc(gym.timezone).toISOString();
  const nowIso = new Date().toISOString();
  const dateStamp = formatLocal(nowIso, gym.timezone, 'EEEE · MMM d, yyyy');

  const [
    { count: equipmentCount },
    { count: memberCount },
    { count: todayScans },
    { count: todaySets },
  ] = await Promise.all([
    supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('gym_id', gym.id),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gym.id),
    supabase
      .from('scan_events')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gym.id)
      .gte('scanned_at', todayIso),
    supabase
      .from('sets')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gym.id)
      .gte('logged_at', todayIso),
  ]);

  return (
    <div className="space-y-16">
      <EditorialHeader
        kicker={`Vol. I  ·  ${gym.slug}`}
        title={gym.name}
        subtitle="Every scan, every set, every member — gathered quietly into one room."
        meta={dateStamp}
      />

      {/* ── Today ─────────────────────────────────────────── */}
      <section>
        <MonoRule>The day so far</MonoRule>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Scans today" value={todayScans ?? 0} />
          <StatCard label="Sets logged today" value={todaySets ?? 0} />
        </div>
      </section>

      {/* ── All-time ──────────────────────────────────────── */}
      <section>
        <MonoRule>The floor</MonoRule>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Equipment"
            value={equipmentCount ?? 0}
            href="/owner/equipment"
            emphasis="secondary"
          />
          <StatCard
            label="Members"
            value={memberCount ?? 0}
            href="/owner/members"
            emphasis="secondary"
          />
        </div>
      </section>

      {/* ── Quick actions ─────────────────────────────────── */}
      <section>
        <MonoRule>Move the room</MonoRule>
        <div className="mt-2 border-t border-white/10">
          <ActionCard
            index="01"
            title="Add a piece of equipment"
            blurb="Generates a QR code you can print and stick on the machine. Members scan it once and the gym remembers them forever."
            href="/owner/equipment/new"
          />
          <ActionCard
            index="02"
            title="Manage the floor"
            blurb="View, edit, deactivate, or reprint stickers. Every machine carries its own usage record."
            href="/owner/equipment"
          />
          <ActionCard
            index="03"
            title="The roster"
            blurb="See who’s active, reset passcodes, and read the aggregate pulse of your gym — never the individual lifts."
            href="/owner/members"
          />
          <ActionCard
            index="04"
            title="Settings & branding"
            blurb="Theme, timezone, gym slug. Quiet controls for the room you’ve built."
            href="/owner/branding"
          />
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-white/10 pt-6 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-600">
        <span>RepTag &middot; Central Command</span>
        <span>{dateStamp}</span>
      </footer>
    </div>
  );
}
