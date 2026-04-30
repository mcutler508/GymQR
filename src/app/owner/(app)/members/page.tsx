import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { MemberRow } from './MemberRow';

export const dynamic = 'force-dynamic';

type MemberRecord = {
  id: string;
  name: string;
  created_at: string;
  passcode_hash: string | null;
};

export default async function MembersPage() {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', userData.user.id)
    .maybeSingle();
  if (!gym) redirect('/owner');

  // Aggregate-only data — owners see counts, never individual lift detail
  // (planning doc §20).
  const [membersRes, setsRes] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, created_at, passcode_hash')
      .eq('gym_id', gym.id)
      .order('created_at', { ascending: false })
      .returns<MemberRecord[]>(),
    supabase
      .from('sets')
      .select('member_id, equipment_id, logged_at')
      .eq('gym_id', gym.id),
  ]);

  const members = membersRes.data ?? [];
  const sets = setsRes.data ?? [];

  type Agg = {
    setCount: number;
    machines: Set<string>;
    lastSet: string | null;
  };
  const agg = new Map<string, Agg>();
  for (const s of sets) {
    if (!s.member_id) continue;
    const cur = agg.get(s.member_id) ?? {
      setCount: 0,
      machines: new Set<string>(),
      lastSet: null,
    };
    cur.setCount += 1;
    cur.machines.add(s.equipment_id);
    if (!cur.lastSet || s.logged_at > cur.lastSet) cur.lastSet = s.logged_at;
    agg.set(s.member_id, cur);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {members.length} member{members.length === 1 ? '' : 's'} ·{' '}
          <span className="text-neutral-400">aggregate counts only — individual lift detail stays private</span>
        </p>
      </header>

      {members.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No members yet. They&apos;ll show up here as soon as someone scans a QR sticker and signs up.
        </p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => {
            const a = agg.get(m.id);
            return (
              <MemberRow
                key={m.id}
                id={m.id}
                name={m.name}
                joined={m.created_at}
                hasPasscode={!!m.passcode_hash}
                setCount={a?.setCount ?? 0}
                machineCount={a?.machines.size ?? 0}
                lastSet={a?.lastSet ?? null}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
