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
import { MachineCardsView, type MachineStat } from './MachineCardsView';
import { MachineTableView } from './MachineTableView';
import { WeeklyBarCharts } from './WeeklyBarCharts';
import type { WeeklyBucket } from '@/lib/stats';

type Props = {
  machines: MachineStat[];
  rows: MemberStatRow[];
  buckets: WeeklyBucket[];
  hasCardio: boolean;
};

export function MemberStatsClient({ machines, rows, buckets, hasCardio }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [columnIds, setColumnIds] = useState<ColumnId[]>(DEFAULT_COLUMN_IDS);

  // Load persisted preferences after mount (avoids SSR/CSR mismatch).
  useEffect(() => {
    setViewMode(loadViewMode());
    setColumnIds(loadColumnIds());
  }, []);

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

  // Render columns in the canonical ALL_COLUMNS order regardless of toggle order.
  const orderedColumnIds = useMemo<ColumnId[]>(() => {
    return ALL_COLUMNS.filter((c) => columnIds.includes(c.id)).map((c) => c.id);
  }, [columnIds]);

  const showCharts = buckets.length > 0 && machines.length > 0;

  return (
    <>
      {showCharts && <WeeklyBarCharts buckets={buckets} hasCardio={hasCardio} />}

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          Per-machine
        </h2>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={changeViewMode} />
          {viewMode === 'table' && (
            <ColumnPicker columnIds={columnIds} onToggle={toggleColumn} />
          )}
        </div>
      </div>

      {machines.length === 0 ? (
        <p className="text-sm text-muted">
          No sets logged yet. Scan a QR sticker to get started.
        </p>
      ) : viewMode === 'cards' ? (
        <MachineCardsView machines={machines} />
      ) : (
        <MachineTableView rows={rows} columnIds={orderedColumnIds} />
      )}
    </>
  );
}

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
