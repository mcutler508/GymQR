'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_COLUMNS,
  DEFAULT_COLUMN_IDS,
  loadColumnIds,
  loadViewMode,
  saveColumnIds,
  saveViewMode,
  type ColumnId,
  type MemberStatRow,
  type ViewMode,
} from '@/lib/member-stats-columns';
import {
  RANGE_OPTIONS,
  bucketsForRange,
  filterByRange,
  loadRange,
  priorRangeLabel,
  priorRangeTotals,
  rangeStartIso,
  saveRange,
  type RangeKey,
} from '@/lib/member-range';
import { prFor, weeklyStreak } from '@/lib/stats';
import { cardioBest } from '@/lib/cardio';
import type { EquipmentType } from '@/lib/supabase';
import { MachineCardsView, type MachineStat, type ExerciseStat } from './MachineCardsView';
import { MachineTableView } from './MachineTableView';
import { ActivityChart } from './_components/ActivityChart';
import { KpiTile } from './_components/KpiTile';
import { RangePicker } from './_components/RangePicker';
import { StreakChip } from './_components/StreakChip';
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
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [columnIds, setColumnIds] = useState<ColumnId[]>(DEFAULT_COLUMN_IDS);

  useEffect(() => {
    setRange(loadRange());
    setViewMode(loadViewMode());
    setColumnIds(loadColumnIds());
  }, []);

  function changeRange(next: RangeKey) {
    setRange(next);
    saveRange(next);
  }

  function changeViewMode(next: ViewMode) {
    setViewMode(next);
    saveViewMode(next);
  }

  function toggleColumn(id: ColumnId) {
    setColumnIds((prev) => {
      const def = ALL_COLUMNS.find((c) => c.id === id);
      if (def?.required) return prev;
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveColumnIds(next);
      return next;
    });
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

  const priorLabel = priorRangeLabel(range);

  const rangeStart = useMemo(
    () => rangeStartIso(range, timezone),
    [range, timezone],
  );

  const machines = useMemo<MachineStat[]>(
    () => buildMachines(rangedSets, sets, equipmentById, timezone, rangeStart),
    [rangedSets, sets, equipmentById, timezone, rangeStart],
  );

  const rows = useMemo<MemberStatRow[]>(
    () => buildRows(sets, rangedSets, equipmentById),
    [sets, rangedSets, equipmentById],
  );

  const orderedColumnIds = useMemo<ColumnId[]>(
    () => ALL_COLUMNS.filter((c) => columnIds.includes(c.id)).map((c) => c.id),
    [columnIds],
  );

  const sublabel = RANGE_OPTIONS.find((o) => o.key === range)?.sublabel ?? '';
  const hasAnySets = sets.length > 0;
  const hasRangeSets = rangedSets.length > 0;

  return (
    <>
      <header className="mb-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-1">
          Member · {gymName}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className={themeClassNames}>{memberName}</h1>
          <StreakChip days={streak} />
        </div>
      </header>

      <div className="mb-4">
        <RangePicker value={range} onChange={changeRange} />
      </div>

      <section className="grid grid-cols-2 gap-3 mb-2">
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
      {priorLabel && (
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-6">
          Δ {priorLabel}
        </p>
      )}
      {!priorLabel && <div className="mb-6" />}

      {hasAnySets && <ActivityChart buckets={buckets} scale={scale} hasCardio={hasCardio} />}

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          Machines · {sublabel}
        </h2>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={changeViewMode} />
          {viewMode === 'table' && (
            <ColumnPicker columnIds={columnIds} onToggle={toggleColumn} />
          )}
        </div>
      </div>

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
        <p className="text-sm text-muted">
          No activity in this range. Try a wider window above.
        </p>
      ) : viewMode === 'cards' ? (
        <MachineCardsView machines={machines} />
      ) : (
        <MachineTableView rows={rows} columnIds={orderedColumnIds} />
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
  if (current === prior) {
    return { value: 'No change', direction: 'flat' };
  }
  const diff = current - prior;
  if (prior === 0) {
    return { value: `+${formatAbs(diff)}`, direction: 'up' };
  }
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
  // Group lifetime sets per equipment so PR (and prInRange detection) reflects
  // the member's entire history, not just the active range.
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
    const progression = progressionInTz(machineSets, timezone);

    // PR set within the active range? Compare the lifetime PR's logged_at to
    // the range start (in the gym TZ). If the PR happened during the range, we
    // want to celebrate it with a small accent dot in the card.
    const prInRange =
      pr != null && rangeStart != null && pr.logged_at >= rangeStart;

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

function buildRows(
  allSets: ClientSet[],
  rangedSets: ClientSet[],
  equipmentById: Map<string, EquipmentMeta>,
): MemberStatRow[] {
  const allByEq = new Map<string, ClientSet[]>();
  for (const s of allSets) {
    if (!allByEq.has(s.equipment_id)) allByEq.set(s.equipment_id, []);
    allByEq.get(s.equipment_id)!.push(s);
  }
  const rangedByEq = new Map<string, ClientSet[]>();
  for (const s of rangedSets) {
    if (!rangedByEq.has(s.equipment_id)) rangedByEq.set(s.equipment_id, []);
    rangedByEq.get(s.equipment_id)!.push(s);
  }

  const rows: MemberStatRow[] = [];
  const seen = new globalThis.Set<string>();
  for (const id of [...allByEq.keys(), ...rangedByEq.keys()]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const meta = equipmentById.get(id);
    if (!meta) continue;

    const lifetimeSets = allByEq.get(id) ?? [];
    const inRangeSets = rangedByEq.get(id) ?? [];

    if (meta.equipment_type === 'strength_multi') {
      const allByEx = groupByExercise(lifetimeSets);
      const inRangeByEx = groupByExercise(inRangeSets);
      const exKeys = new globalThis.Set<string>([
        ...allByEx.keys(),
        ...inRangeByEx.keys(),
      ]);
      for (const exKey of exKeys) {
        const lifetimeEx = allByEx.get(exKey) ?? [];
        const rangedEx = inRangeByEx.get(exKey) ?? [];
        rows.push(buildRow({
          rowId: `${id}::${exKey}`,
          equipmentId: id,
          meta,
          exerciseName: exKey === '__unlabeled__' ? null : exKey,
          lifetimeSets: lifetimeEx,
          rangedSets: rangedEx,
        }));
      }
    } else {
      rows.push(buildRow({
        rowId: id,
        equipmentId: id,
        meta,
        exerciseName: null,
        lifetimeSets,
        rangedSets: inRangeSets,
      }));
    }
  }

  return rows.filter((r) => r.setCount > 0);
}

function buildRow(input: {
  rowId: string;
  equipmentId: string;
  meta: EquipmentMeta;
  exerciseName: string | null;
  lifetimeSets: ClientSet[];
  rangedSets: ClientSet[];
}): MemberStatRow {
  const lifetimePr = prFor(input.lifetimeSets);
  const rangedPr = prFor(input.rangedSets);

  let totalVolume = 0;
  for (const s of input.rangedSets) {
    if (s.weight != null && s.reps != null) {
      totalVolume += Number(s.weight) * Number(s.reps);
    }
  }

  let longestCardioSeconds = 0;
  let longestCardioMeters = 0;
  if (input.meta.equipment_type === 'cardio') {
    const best = cardioBest(input.rangedSets);
    longestCardioSeconds = best.longestDurationSeconds;
    longestCardioMeters = best.longestDistanceMeters;
  }

  return {
    id: input.rowId,
    equipmentId: input.equipmentId,
    machineName: input.meta.name,
    machineLabel: input.meta.machine_label,
    equipmentType: input.meta.equipment_type,
    exerciseName: input.exerciseName,
    setCount: input.rangedSets.length,
    prWeight: lifetimePr?.weight ?? null,
    prReps: lifetimePr?.reps ?? null,
    rangePrWeight: rangedPr?.weight ?? null,
    rangePrReps: rangedPr?.reps ?? null,
    lastLoggedAt: latest(input.lifetimeSets),
    totalVolume,
    longestCardioSeconds,
    longestCardioMeters,
  };
}

function groupByExercise(sets: ClientSet[]): Map<string, ClientSet[]> {
  const m = new Map<string, ClientSet[]>();
  for (const s of sets) {
    const key = s.exercise_name ?? '__unlabeled__';
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(s);
  }
  return m;
}

function progressionInTz(sets: ClientSet[], timezone: string) {
  const byDay = new Map<string, { weight: number; reps: number }>();
  for (const s of sets) {
    if (s.weight == null || s.reps == null) continue;
    const day = s.logged_at.slice(0, 10);
    const w = Number(s.weight);
    const r = Number(s.reps);
    const cur = byDay.get(day);
    if (!cur || w > cur.weight || (w === cur.weight && r > cur.reps)) {
      byDay.set(day, { weight: w, reps: r });
    }
  }
  void timezone;
  return Array.from(byDay.entries())
    .map(([day, v]) => ({
      day,
      ts: new Date(`${day}T12:00:00Z`).getTime(),
      weight: v.weight,
      reps: v.reps,
    }))
    .sort((a, b) => a.ts - b.ts);
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

/* ---------------------------- UI fragments ---------------------------- */

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-card bg-surface border border-line text-xs">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`px-2.5 py-1 rounded transition-colors ${
          value === 'cards'
            ? 'bg-accent text-accent-ink font-medium'
            : 'text-muted hover:text-ink'
        }`}
      >
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`px-2.5 py-1 rounded transition-colors ${
          value === 'table'
            ? 'bg-accent text-accent-ink font-medium'
            : 'text-muted hover:text-ink'
        }`}
      >
        Table
      </button>
    </div>
  );
}

function ColumnPicker({
  columnIds,
  onToggle,
}: {
  columnIds: ColumnId[];
  onToggle: (id: ColumnId) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-2.5 py-1.5 rounded-card border border-line text-xs text-muted-strong hover:border-muted hover:text-ink transition-colors"
      >
        Columns ({columnIds.length})
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-card border border-line bg-surface-2 shadow-2xl z-10 max-h-96 overflow-y-auto">
          <div className="p-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted px-2 py-1.5">
              Show columns
            </p>
            {ALL_COLUMNS.map((c) => {
              const checked = columnIds.includes(c.id);
              const disabled = c.required;
              return (
                <label
                  key={c.id}
                  className={[
                    'flex items-center gap-3 px-2 py-1.5 rounded text-sm transition-colors',
                    disabled
                      ? 'text-muted cursor-not-allowed'
                      : 'text-muted-strong hover:bg-surface hover:text-ink cursor-pointer',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(c.id)}
                    className="h-4 w-4 accent-current"
                  />
                  <span className="flex-1">{c.label}</span>
                  {disabled && (
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      pinned
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
