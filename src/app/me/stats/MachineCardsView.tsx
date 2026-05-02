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
      className="block p-4 rounded-card bg-surface border border-line hover:border-muted transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{machine.name}</p>
          <p className="text-xs text-muted">
            {[machine.label, `${machine.setCount} sets`].filter(Boolean).join(' · ')}
          </p>
          {machine.pr && (
            <p className="text-sm text-muted-strong mt-2 tabular-nums">
              PR{' '}
              <span className="font-semibold text-ink">
                {fmtWeight(machine.pr.weight)} × {machine.pr.reps}
              </span>
            </p>
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
      className="block p-4 rounded-card bg-surface border border-line hover:border-muted transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">
            {machine.name}
            <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-line text-muted-strong align-middle">
              Cardio
            </span>
          </p>
          <p className="text-xs text-muted">
            {[machine.label, `${machine.setCount} ${machine.setCount === 1 ? 'session' : 'sessions'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {c && c.longestDurationSeconds > 0 && (
            <p className="text-sm text-muted-strong mt-2 tabular-nums">
              Longest{' '}
              <span className="font-semibold text-ink">
                {formatDuration(c.longestDurationSeconds)}
              </span>
              {c.longestDistanceMeters > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-ink">
                    {formatMiles(c.longestDistanceMeters)} mi
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function MultiMachineCard({ machine }: { machine: MachineStat }) {
  return (
    <div className="p-4 rounded-card bg-surface border border-line">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">
            {machine.name}
            <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-line text-muted-strong align-middle">
              Multi
            </span>
          </p>
          <p className="text-xs text-muted">
            {[machine.label, `${machine.setCount} sets across ${machine.exercises.length} exercises`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {machine.exercises.map((ex) => {
          const exHref = ex.name
            ? `/me/stats/${machine.id}?exercise=${encodeURIComponent(ex.name)}`
            : `/me/stats/${machine.id}`;
          return (
            <li key={ex.name ?? '(unlabeled)'}>
              <Link
                href={exHref}
                className="flex items-center justify-between gap-4 py-2 hover:opacity-80 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {ex.name ?? '(unlabeled)'}
                  </p>
                  <p className="text-xs text-muted">
                    {ex.setCount} {ex.setCount === 1 ? 'set' : 'sets'}
                  </p>
                </div>
                {ex.pr ? (
                  <p className="text-sm tabular-nums shrink-0">
                    <span className="text-muted text-xs">PR </span>
                    <span className="font-semibold">
                      {fmtWeight(ex.pr.weight)} × {ex.pr.reps}
                    </span>
                  </p>
                ) : (
                  <span className="text-xs text-muted">no PR yet</span>
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
