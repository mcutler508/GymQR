import { cookies } from 'next/headers';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { groupIntoSessions } from '@/lib/stats';
import { formatDuration, formatMiles } from '@/lib/cardio';
import { formatLocal } from '@/lib/timezone';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';
import type { EquipmentType } from '@/lib/supabase';
import { EmptyState } from '@/app/me/stats/_components/EmptyState';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';
const SESSION_LIMIT = 25;

type HistorySet = {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  exercise_name: string | null;
  logged_at: string;
  equipment_id: string;
  equipment: {
    id: string;
    name: string;
    equipment_type: EquipmentType;
  } | null;
};

export default async function MemberHistoryPage() {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)!.value;

  const { data: member } = await supabase
    .from('members')
    .select('gyms(timezone)')
    .eq('id', memberId)
    .maybeSingle<{ gyms: { timezone: string; theme: GymTheme } | null }>();
  const timezone = member?.gyms?.timezone ?? 'UTC';

  const { data: setsRaw } = await supabase
    .from('sets')
    .select(
      'weight, reps, duration_seconds, distance_meters, exercise_name, logged_at, equipment_id, equipment(id, name, equipment_type)',
    )
    .eq('member_id', memberId)
    .order('logged_at', { ascending: false })
    .limit(500)
    .returns<HistorySet[]>();

  const sets = setsRaw ?? [];
  // groupIntoSessions returns chronological (oldest → newest). The history page
  // surfaces the most recent session first, so we reverse and cap the list.
  const sessions = groupIntoSessions(sets, 2).reverse().slice(0, SESSION_LIMIT);

  return (
    <>
      <header className="mb-7">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-1.5">
          History · last {sessions.length || 0} {sessions.length === 1 ? 'session' : 'sessions'}
        </p>
        <h1
          className={[
            'font-display tracking-tight leading-none',
            'halogen:text-4xl halogen:font-medium',
            'concrete:text-5xl concrete:font-black concrete:uppercase concrete:leading-[0.9]',
            'locker:text-3xl locker:font-semibold',
            'athletic:text-4xl athletic:font-black athletic:italic athletic:uppercase',
          ].join(' ')}
        >
          Recent sessions
        </h1>
      </header>

      {sessions.length === 0 ? (
        <EmptyState
          kicker="No sessions yet"
          headline="Log your first set and it'll show up here"
          sublabel="A session is anything you log in one sitting — we group sets within 2 hours of each other into the same workout."
          cta={{ label: 'Open scanner', href: '/scan' }}
        />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {sessions.map((session) => (
            <SessionRow
              key={session.startedAt}
              startedAt={session.startedAt}
              endedAt={session.endedAt}
              sets={session.sets}
              timezone={timezone}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function SessionRow({
  startedAt,
  endedAt,
  sets,
  timezone,
}: {
  startedAt: string;
  endedAt: string;
  sets: HistorySet[];
  timezone: string;
}) {
  // One sub-row per equipment, preserving the order in which the member visited.
  type Group = { equipmentId: string; name: string; type: EquipmentType; sets: HistorySet[] };
  const groups: Group[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.equipmentId === s.equipment_id) {
      last.sets.push(s);
    } else {
      groups.push({
        equipmentId: s.equipment_id,
        name: s.equipment?.name ?? 'Unknown machine',
        type: s.equipment?.equipment_type ?? 'strength_single',
        sets: [s],
      });
    }
  }

  const durationMin = Math.max(
    1,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000),
  );
  const dayLabel = formatLocal(startedAt, timezone, 'EEE LLL d');
  const timeLabel = formatLocal(startedAt, timezone, 'h:mm a');

  return (
    <li className="py-5">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          {dayLabel} · {timeLabel}
        </p>
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted tabular-nums">
          {sets.length} {sets.length === 1 ? 'set' : 'sets'} · {groups.length} {groups.length === 1 ? 'machine' : 'machines'} · {durationMin}m
        </p>
      </div>
      <ul className="space-y-2">
        {groups.map((g) => (
          <li key={g.equipmentId} className="flex items-start justify-between gap-4">
            <Link
              href={`/me/stats/${g.equipmentId}`}
              className="font-medium text-ink shrink-0 hover:underline"
            >
              {g.name}
            </Link>
            <p className="text-sm text-muted-strong tabular-nums text-right">
              {summarizeGroup(g)}
            </p>
          </li>
        ))}
      </ul>
    </li>
  );
}

function summarizeGroup(group: { sets: HistorySet[]; type: EquipmentType }): string {
  if (group.type === 'cardio') {
    // Show the longest session of the group.
    let longest = group.sets[0];
    for (const s of group.sets) {
      if ((s.duration_seconds ?? 0) > (longest.duration_seconds ?? 0)) longest = s;
    }
    const dur = longest.duration_seconds ? formatDuration(longest.duration_seconds) : '—';
    const dist =
      longest.distance_meters && longest.distance_meters > 0
        ? ` · ${formatMiles(longest.distance_meters)} mi`
        : '';
    return `${dur}${dist}`;
  }
  // Strength: list up to 3 set summaries, then collapse the rest.
  const labels = group.sets
    .filter((s) => s.weight != null && s.reps != null)
    .slice(0, 3)
    .map((s) => `${fmtWeight(Number(s.weight))}×${s.reps}`);
  const extra = Math.max(0, group.sets.length - labels.length);
  return labels.join(', ') + (extra > 0 ? ` +${extra}` : '');
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
