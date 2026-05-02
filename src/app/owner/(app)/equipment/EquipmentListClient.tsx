'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ALL_COLUMNS,
  DEFAULT_COLUMN_IDS,
  loadColumnIds,
  loadViewMode,
  saveColumnIds,
  saveViewMode,
  type ColumnId,
  type EquipmentTableRow,
  type ViewMode,
} from '@/lib/equipment-columns';
import { CardsView } from './CardsView';
import { TableView } from './TableView';

export function EquipmentListClient({ rows }: { rows: EquipmentTableRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [columnIds, setColumnIds] = useState<ColumnId[]>(DEFAULT_COLUMN_IDS);

  // Load persisted preferences on mount only.
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
      if (def?.required) return prev; // Required columns can't be hidden.
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveColumnIds(next);
      return next;
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function printSelected() {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(',');
    router.push(`/owner/equipment/print?ids=${encodeURIComponent(ids)}`);
  }

  const selectedCount = selected.size;
  const buttonLabel =
    selectedCount === 0
      ? 'Print selected'
      : selectedCount === 1
        ? 'Print 1 selected'
        : `Print ${selectedCount} selected`;

  // Sort columns to match ALL_COLUMNS canonical order regardless of toggle order.
  const orderedColumnIds = useMemo<ColumnId[]>(() => {
    return ALL_COLUMNS.filter((c) => columnIds.includes(c.id)).map((c) => c.id);
  }, [columnIds]);

  return (
    <div>
      <header className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="text-2xl font-semibold tracking-tight">Equipment</h1>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={changeViewMode} />
          {viewMode === 'table' && (
            <ColumnPicker columnIds={columnIds} onToggle={toggleColumn} />
          )}
          <Link
            href="/owner/equipment/new"
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium"
          >
            + New
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No equipment yet. Click <span className="text-neutral-200">New</span> to add your first machine.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={toggleAll}
                className="h-4 w-4 accent-white"
                aria-label="Select all equipment"
              />
              <span className="text-sm text-neutral-300">
                {selectedCount === 0
                  ? 'Select all'
                  : `${selectedCount} of ${rows.length} selected`}
              </span>
            </label>
            <button
              type="button"
              onClick={printSelected}
              disabled={selectedCount === 0}
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {buttonLabel}
            </button>
          </div>

          {viewMode === 'cards' ? (
            <CardsView rows={rows} selected={selected} onToggle={toggle} />
          ) : (
            <TableView
              rows={rows}
              columnIds={orderedColumnIds}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleAll}
              allChecked={allChecked}
              someChecked={someChecked}
            />
          )}
        </>
      )}
    </div>
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
    <div className="inline-flex p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-sm">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`px-3 py-1.5 rounded-md transition ${
          value === 'cards'
            ? 'bg-white text-black font-medium'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`px-3 py-1.5 rounded-md transition ${
          value === 'table'
            ? 'bg-white text-black font-medium'
            : 'text-neutral-400 hover:text-neutral-200'
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

  const visibleCount = columnIds.length;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 rounded-lg border border-neutral-700 text-sm text-neutral-200 hover:border-neutral-500"
      >
        Columns ({visibleCount})
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-neutral-800 bg-neutral-950 shadow-xl z-10 max-h-96 overflow-y-auto">
          <div className="p-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 px-2 py-1.5">
              Show columns
            </p>
            {ALL_COLUMNS.map((c) => {
              const checked = columnIds.includes(c.id);
              const disabled = c.required;
              return (
                <label
                  key={c.id}
                  className={[
                    'flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer text-sm',
                    disabled
                      ? 'text-neutral-500 cursor-not-allowed'
                      : 'text-neutral-200 hover:bg-neutral-900',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(c.id)}
                    className="h-4 w-4 accent-white"
                  />
                  <span className="flex-1">{c.label}</span>
                  {disabled && (
                    <span className="text-[10px] uppercase tracking-wider text-neutral-600">
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
