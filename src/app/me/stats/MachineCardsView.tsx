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

export function MachineCardsView({ machines }: { machines: MachineStat[] }) {
  return (
    <ul className="space-y-3">
      {machines.map((m) => (
        <li key={m.id}>
          {m.equipmentType === 'cardio' ? (
            <CardioMachineCard machine={m} />
          ) : m.equipmentType === 'strength_multi' ? (
            <MultiMachineCard machine={m} />
          ) : (
            <SingleMachineCard machine={m} />
          )}
        </li>
      ))}
    </ul>
  );
}

function SingleMachineCard({ machine }: { machine: MachineStat }) {
  return (
    <Link
      href={`/me/stats/${machine.id}`}
      className="block p-5 rounded-card bg-surface border border-line hover:border-muted transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink truncate">{machine.name}</p>
          <p className="mt-0.5 text-[11px] font-mono uppercase tracking-[0.15em] text-muted">
            {[machine.label, `${machine.setCount} ${machine.setCount === 1 ? 'set' : 'sets'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {machine.pr && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">PR</span>
              <span className="font-display text-lg text-ink tabular-nums leading-none">
                {fmtWeight(machine.pr.weight)} × {machine.pr.reps}
              </span>
              {machine.prInRange && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
                  title="New PR in this range"
                  aria-label="New PR in this range"
                />
              )}
            </div>
          )}
        </div>
        <Sparkline points={machine.progression.map((p) => p.weight)} />
      </div>
    </Link>
  );
}

function CardioMachineCard({ machine }: { machine: MachineStat }) {
  const c = machine.cardio;
  return (
    <Link
      href={`/me/stats/${machine.id}`}
      className="block p-5 rounded-card bg-surface border border-line hover:border-muted transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-ink">{machine.name}</p>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-line text-muted-strong">
              Cardio
            </span>
          </div>
          <p className="mt-0.5 text-[11px] font-mono uppercase tracking-[0.15em] text-muted">
            {[machine.label, `${machine.setCount} ${machine.setCount === 1 ? 'session' : 'sessions'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {c && c.longestDurationSeconds > 0 && (
            <div className="mt-3 flex items-baseline gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Longest</span>
              <span className="font-display text-lg text-ink tabular-nums leading-none">
                {formatDuration(c.longestDurationSeconds)}
              </span>
              {c.longestDistanceMeters > 0 && (
                <span className="font-display text-base text-muted-strong tabular-nums leading-none">
                  · {formatMiles(c.longestDistanceMeters)} mi
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function MultiMachineCard({ machine }: { machine: MachineStat }) {
  return (
    <div className="p-5 rounded-card bg-surface border border-line">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-ink">{machine.name}</p>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-line text-muted-strong">
              Multi
            </span>
          </div>
          <p className="mt-0.5 text-[11px] font-mono uppercase tracking-[0.15em] text-muted">
            {[machine.label, `${machine.setCount} sets · ${machine.exercises.length} exercises`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {machine.exercises.map((ex) => {
          const exHref = ex.name
            ? `/me/stats/${machine.id}?exercise=${encodeURIComponent(ex.name)}`
            : `/me/stats/${machine.id}`;
          return (
            <li key={ex.name ?? '(unlabeled)'}>
              <Link
                href={exHref}
                className="flex items-center justify-between gap-4 py-2.5 hover:opacity-80 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {ex.name ?? '(unlabeled)'}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted mt-0.5">
                    {ex.setCount} {ex.setCount === 1 ? 'set' : 'sets'}
                  </p>
                </div>
                {ex.pr ? (
                  <p className="text-sm tabular-nums shrink-0">
                    <span className="text-muted text-[10px] font-mono uppercase tracking-[0.2em] mr-1">PR</span>
                    <span className="font-display text-ink">
                      {fmtWeight(ex.pr.weight)} × {ex.pr.reps}
                    </span>
                  </p>
                ) : (
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">no PR yet</span>
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
