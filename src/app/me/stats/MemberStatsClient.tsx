'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  RANGE_OPTIONS,
  bucketsForRange,
  filterByRange,
  loadRange,
  priorRangeTotals,
  rangeStartIso,
  saveRange,
  type RangeKey,
} from '@/lib/member-range';
import { prFor, progressionFor, weeklyStreak } from '@/lib/stats';
import { cardioBest } from '@/lib/cardio';
import type { EquipmentType } from '@/lib/supabase';
import { MachineCardsView, type MachineStat, type ExerciseStat } from './MachineCardsView';
import { ActivityChart } from './_components/ActivityChart';
import { KpiTile } from './_components/KpiTile';
import { RangePicker } from './_components/RangePicker';
import { EmptyState } from './_components/EmptyState';
import type { Delta } from './_components/DeltaIndicator';

export type ClientSet = {
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  logged_at: string;
  equipment_id: string;
  exercise_name: string | null;
};

export type EquipmentMeta = {
  id: string;
  name: string;
  machine_label: string | null;
  equipment_type: EquipmentType;
};

type Props = {
  memberName: string;
  gymName: string;
  themeClassNames: string;
  sets: ClientSet[];
  equipment: EquipmentMeta[];
  timezone: string;
};

export function MemberStatsClient({
  memberName,
  gymName,
  themeClassNames,
  sets,
  equipment,
  timezone,
}: Props) {
  const [range, setRange] = useState<RangeKey>('month');

  useEffect(() => {
    setRange(loadRange());
  }, []);

  function changeRange(next: RangeKey) {
    setRange(next);
    saveRange(next);
  }

  const equipmentById = useMemo(() => {
    const m = new Map<string, EquipmentMeta>();
    for (const e of equipment) m.set(e.id, e);
    return m;
  }, [equipment]);

  const rangedSets = useMemo(
    () => filterByRange(sets, range, timezone),
    [sets, range, timezone],
  );

  const { buckets, scale } = useMemo(
    () => bucketsForRange(sets, range, timezone),
    [sets, range, timezone],
  );

  const hasCardio = useMemo(
    () => sets.some((s) => s.duration_seconds != null),
    [sets],
  );

  const hero = useMemo(() => computeHero(rangedSets, sets), [rangedSets, sets]);

  const prior = useMemo(
    () => priorRangeTotals(sets, range, timezone),
    [sets, range, timezone],
  );

  const streak = useMemo(
    () => weeklyStreak(sets, timezone),
    [sets, timezone],
  );

  const rangeStart = useMemo(
    () => rangeStartIso(range, timezone),
    [range, timezone],
  );

  const machines = useMemo<MachineStat[]>(
    () => buildMachines(rangedSets, sets, equipmentById, timezone, rangeStart),
    [rangedSets, sets, equipmentById, timezone, rangeStart],
  );

  const sublabel = RANGE_OPTIONS.find((o) => o.key === range)?.sublabel ?? '';
  const hasAnySets = sets.length > 0;
  const hasRangeSets = rangedSets.length > 0;

  // Single kicker row above the name: "MEMBER · {gym} · {n} DAY STREAK".
  // The streak only appears at 2+ days — a single workout isn't a streak.
  const kickerParts = ['Member', gymName];
  if (streak >= 2) kickerParts.push(`${streak} day streak`);
  const kicker = kickerParts.join(' · ');

  return (
    <>
      <header className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-1.5">
          {kicker}
        </p>
        <h1 className={themeClassNames}>{memberName}</h1>
      </header>

      <div className="mb-7">
        <RangePicker value={range} onChange={changeRange} />
      </div>

      <section className="grid grid-cols-2 gap-x-6 gap-y-7 mb-9">
        <KpiTile
          label="Volume"
          value={fmtVol(hero.volume)}
          sublabel={`lbs ${sublabel}`}
          delta={makeDelta(hero.volume, prior?.volume ?? null, (n) => `${fmtVol(Math.abs(n))} lbs`)}
        />
        <KpiTile
          label="Sets"
          value={String(hero.setCount)}
          sublabel={sublabel}
          delta={makeDelta(hero.setCount, prior?.setCount ?? null, (n) => String(Math.abs(n)))}
        />
        <KpiTile
          label="Workouts"
          value={String(hero.workoutDays)}
          sublabel={`days ${sublabel}`}
          delta={makeDelta(hero.workoutDays, prior?.workoutDays ?? null, (n) => `${Math.abs(n)} ${Math.abs(n) === 1 ? 'day' : 'days'}`)}
        />
        <KpiTile
          label="Lifetime PR"
          value={
            hero.lifetimePr
              ? `${fmtWeight(hero.lifetimePr.weight)} × ${hero.lifetimePr.reps}`
              : '—'
          }
          sublabel={hero.lifetimePr ? 'all time' : 'no sets yet'}
          accent={!!hero.lifetimePr}
        />
      </section>

      {hasAnySets && <ActivityChart buckets={buckets} scale={scale} hasCardio={hasCardio} />}

      <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-3">
        Machines · {sublabel}
      </h2>

      {!hasAnySets ? (
        <EmptyState
          kicker="No data yet"
          headline="Your first set is one scan away"
          sublabel="Scan a QR sticker on any machine to log your first set and start your stats."
          cta={{ label: 'Open scanner', href: '/scan' }}
        />
      ) : !hasRangeSets ? (
        <EmptyState
          kicker="Nothing in this range"
          headline={`No sessions ${sublabel}`}
          sublabel="Try a wider window above, or scan a machine to log a fresh set."
          cta={{ label: 'Open scanner', href: '/scan' }}
        />
      ) : machines.length === 0 ? (
        <p className="text-sm text-muted">No activity in this range. Try a wider window above.</p>
      ) : (
        <MachineCardsView machines={machines} />
      )}
    </>
  );
}

/* ---------------------------- compute helpers ---------------------------- */

function makeDelta(
  current: number,
  prior: number | null,
  formatAbs: (absDiff: number) => string,
): Delta | null {
  if (prior == null) return null;
  if (current === 0 && prior === 0) return null;
  if (current === prior) return { value: 'No change', direction: 'flat' };
  const diff = current - prior;
  if (prior === 0) return { value: `+${formatAbs(diff)}`, direction: 'up' };
  const pct = Math.round((diff / prior) * 100);
  return {
    value: `${Math.abs(pct)}%`,
    direction: diff > 0 ? 'up' : 'down',
  };
}

function computeHero(rangedSets: ClientSet[], allSets: ClientSet[]) {
  let volume = 0;
  const days = new globalThis.Set<string>();
  for (const s of rangedSets) {
    if (s.weight != null && s.reps != null) {
      volume += Number(s.weight) * Number(s.reps);
    }
    days.add(s.logged_at.slice(0, 10));
  }
  return {
    volume: Math.round(volume),
    setCount: rangedSets.length,
    workoutDays: days.size,
    lifetimePr: prFor(allSets),
  };
}

function buildMachines(
  rangedSets: ClientSet[],
  allSets: ClientSet[],
  equipmentById: Map<string, EquipmentMeta>,
  timezone: string,
  rangeStart: string | null,
): MachineStat[] {
  const lifetimeByEquipment = new Map<string, ClientSet[]>();
  for (const s of allSets) {
    if (!lifetimeByEquipment.has(s.equipment_id)) lifetimeByEquipment.set(s.equipment_id, []);
    lifetimeByEquipment.get(s.equipment_id)!.push(s);
  }

  const byEquipment = new Map<string, ClientSet[]>();
  for (const s of rangedSets) {
    if (!byEquipment.has(s.equipment_id)) byEquipment.set(s.equipment_id, []);
    byEquipment.get(s.equipment_id)!.push(s);
  }

  const machines: MachineStat[] = [];
  for (const [id, machineSets] of byEquipment.entries()) {
    const meta = equipmentById.get(id);
    if (!meta) continue;
    const lifetimeSets = lifetimeByEquipment.get(id) ?? machineSets;
    const pr = prFor(lifetimeSets);
    const progression = progressionFor(machineSets, timezone);
    const prInRange = pr != null && rangeStart != null && pr.logged_at >= rangeStart;

    let exercises: ExerciseStat[] = [];
    let cardio = null;
    if (meta.equipment_type === 'strength_multi') {
      const byEx = new Map<string, ClientSet[]>();
      for (const s of machineSets) {
        const key = s.exercise_name ?? '(unlabeled)';
        if (!byEx.has(key)) byEx.set(key, []);
        byEx.get(key)!.push(s);
      }
      exercises = Array.from(byEx.entries())
        .map(([name, exSets]) => ({
          name: name === '(unlabeled)' ? null : name,
          setCount: exSets.length,
          pr: prFor(exSets),
          lastLogged: latest(exSets),
        }))
        .sort((a, b) => {
          if (!a.lastLogged) return 1;
          if (!b.lastLogged) return -1;
          return a.lastLogged < b.lastLogged ? 1 : -1;
        });
    } else if (meta.equipment_type === 'cardio') {
      cardio = cardioBest(machineSets);
    }

    machines.push({
      id,
      name: meta.name,
      label: meta.machine_label,
      equipmentType: meta.equipment_type,
      setCount: machineSets.length,
      pr,
      prInRange,
      progression,
      lastLogged: latest(machineSets),
      exercises,
      cardio,
    });
  }

  machines.sort((a, b) =>
    a.lastLogged && b.lastLogged ? (a.lastLogged < b.lastLogged ? 1 : -1) : 0,
  );
  return machines;
}

function latest(sets: ClientSet[]): string | null {
  let max: string | null = null;
  for (const s of sets) {
    if (!max || s.logged_at > max) max = s.logged_at;
  }
  return max;
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
