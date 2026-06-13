'use client';

import Link from 'next/link';
import { Sparkline } from './Sparkline';
import { formatDuration, formatMiles, type CardioBest } from '@/lib/cardio';
import type { ProgressionPoint, PR } from '@/lib/stats';
import type { EquipmentType } from '@/lib/supabase';

export type ExerciseStat = {
  name: string | null;
  setCount: number;
  pr: PR;
  lastLogged: string | null;
};

export type MachineStat = {
  id: string;
  name: string;
  label: string | null;
  equipmentType: EquipmentType;
  setCount: number;
  pr: PR;
  prInRange: boolean;
  progression: ProgressionPoint[];
  lastLogged: string | null;
  exercises: ExerciseStat[];
  cardio: CardioBest | null;
};

/**
 * Borderless list — each machine is a row separated by a thin divider, not a
 * boxed card. Same density and feel as Strong / Hevy machine lists.
 */
export function MachineCardsView({ machines }: { machines: MachineStat[] }) {
  return (
    <ul className="divide-y divide-line border-t border-line">
      {machines.map((m) => (
        <li key={m.id}>
          {m.equipmentType === 'cardio' ? (
            <CardioRow machine={m} />
          ) : m.equipmentType === 'strength_multi' ? (
            <MultiRow machine={m} />
          ) : (
            <SingleRow machine={m} />
          )}
        </li>
      ))}
    </ul>
  );
}

function SingleRow({ machine }: { machine: MachineStat }) {
  return (
    <Link
      href={`/me/stats/${machine.id}`}
      className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface-2 -mx-2 px-2 rounded-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink truncate">{machine.name}</p>
        <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          {[machine.label, `${machine.setCount} ${machine.setCount === 1 ? 'set' : 'sets'}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <Sparkline points={machine.progression.map((p) => p.weight)} />
        {machine.pr && (
          <div className="text-right">
            <p className="font-display text-lg text-ink tabular-nums leading-none">
              {fmtWeight(machine.pr.weight)}
              <span className="text-muted-strong"> × </span>
              {machine.pr.reps}
            </p>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
              PR
              {machine.prInRange && (
                <span
                  className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle"
                  title="New PR in this range"
                  aria-label="New PR in this range"
                />
              )}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

function CardioRow({ machine }: { machine: MachineStat }) {
  const c = machine.cardio;
  return (
    <Link
      href={`/me/stats/${machine.id}`}
      className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface-2 -mx-2 px-2 rounded-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink truncate">{machine.name}</p>
        <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          Cardio
          {machine.label && ` · ${machine.label}`}
          {' · '}
          {machine.setCount} {machine.setCount === 1 ? 'session' : 'sessions'}
        </p>
      </div>
      {c && c.longestDurationSeconds > 0 && (
        <div className="text-right shrink-0">
          <p className="font-display text-lg text-ink tabular-nums leading-none">
            {formatDuration(c.longestDurationSeconds)}
          </p>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
            {c.longestDistanceMeters > 0
              ? `Longest · ${formatMiles(c.longestDistanceMeters)} mi`
              : 'Longest'}
          </p>
        </div>
      )}
    </Link>
  );
}

function MultiRow({ machine }: { machine: MachineStat }) {
  return (
    <div className="py-4">
      <p className="font-medium text-ink">{machine.name}</p>
      <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
        Multi
        {machine.label && ` · ${machine.label}`}
        {' · '}
        {machine.setCount} sets across {machine.exercises.length} exercises
      </p>

      <ul className="mt-3 divide-y divide-line-soft border-t border-line-soft">
        {machine.exercises.map((ex) => {
          const exHref = ex.name
            ? `/me/stats/${machine.id}?exercise=${encodeURIComponent(ex.name)}`
            : `/me/stats/${machine.id}`;
          return (
            <li key={ex.name ?? '(unlabeled)'}>
              <Link
                href={exHref}
                className="flex items-center justify-between gap-4 py-2.5 transition-colors hover:bg-surface-2 -mx-2 px-2 rounded-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {ex.name ?? '(unlabeled)'}
                  </p>
                  <p className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
                    {ex.setCount} {ex.setCount === 1 ? 'set' : 'sets'}
                  </p>
                </div>
                {ex.pr ? (
                  <p className="font-display text-sm text-ink tabular-nums shrink-0">
                    {fmtWeight(ex.pr.weight)}
                    <span className="text-muted-strong"> × </span>
                    {ex.pr.reps}
                  </p>
                ) : (
                  <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted">no PR yet</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
