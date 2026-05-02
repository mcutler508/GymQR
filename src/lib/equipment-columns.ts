import type { EquipmentType } from '@/lib/supabase';
import { formatDuration, formatMiles } from '@/lib/cardio';

export type EquipmentTableRow = {
  id: string;
  name: string;
  machine_label: string | null;
  qr_slug: string;
  status: 'active' | 'inactive';
  equipment_type: EquipmentType;
  exercises: string[];
  created_at: string;
  setCount: number;
  uniqueMembers: number;
  todaySetCount: number;
  weekSetCount: number;
  lastSetAt: string | null;
  lastScanAt: string | null;
  totalVolume: number;
  totalCardioSeconds: number;
};

export type ColumnId =
  | 'name'
  | 'type'
  | 'machine_label'
  | 'status'
  | 'exercises'
  | 'set_count'
  | 'unique_members'
  | 'today_sets'
  | 'week_sets'
  | 'total_volume'
  | 'total_cardio_time'
  | 'last_activity'
  | 'last_scan'
  | 'last_set'
  | 'created'
  | 'qr_slug';

export type ColumnDef = {
  id: ColumnId;
  label: string;
  align: 'left' | 'right';
  sortValue: (row: EquipmentTableRow) => string | number;
  render: (row: EquipmentTableRow) => string;
  required?: boolean; // Name is always shown.
};

const TYPE_LABEL: Record<EquipmentType, string> = {
  strength_single: 'Single',
  strength_multi: 'Multi',
  cardio: 'Cardio',
};

export const ALL_COLUMNS: ColumnDef[] = [
  {
    id: 'name',
    label: 'Name',
    align: 'left',
    required: true,
    sortValue: (r) => r.name.toLowerCase(),
    render: (r) => r.name,
  },
  {
    id: 'type',
    label: 'Type',
    align: 'left',
    sortValue: (r) =>
      r.equipment_type === 'strength_multi'
        ? `Multi · ${r.exercises.length}`
        : TYPE_LABEL[r.equipment_type],
    render: (r) =>
      r.equipment_type === 'strength_multi'
        ? `Multi · ${r.exercises.length} ex`
        : TYPE_LABEL[r.equipment_type],
  },
  {
    id: 'machine_label',
    label: 'Label',
    align: 'left',
    sortValue: (r) => (r.machine_label ?? '').toLowerCase(),
    render: (r) => r.machine_label ?? '—',
  },
  {
    id: 'status',
    label: 'Status',
    align: 'left',
    sortValue: (r) => r.status,
    render: (r) => (r.status === 'active' ? 'Active' : 'Inactive'),
  },
  {
    id: 'exercises',
    label: 'Exercises',
    align: 'right',
    sortValue: (r) => r.exercises.length,
    render: (r) => (r.equipment_type === 'strength_multi' ? String(r.exercises.length) : '—'),
  },
  {
    id: 'set_count',
    label: 'Sets',
    align: 'right',
    sortValue: (r) => r.setCount,
    render: (r) => String(r.setCount),
  },
  {
    id: 'unique_members',
    label: 'Members',
    align: 'right',
    sortValue: (r) => r.uniqueMembers,
    render: (r) => String(r.uniqueMembers),
  },
  {
    id: 'today_sets',
    label: 'Today',
    align: 'right',
    sortValue: (r) => r.todaySetCount,
    render: (r) => String(r.todaySetCount),
  },
  {
    id: 'week_sets',
    label: 'This week',
    align: 'right',
    sortValue: (r) => r.weekSetCount,
    render: (r) => String(r.weekSetCount),
  },
  {
    id: 'total_volume',
    label: 'Volume (lbs)',
    align: 'right',
    sortValue: (r) => r.totalVolume,
    render: (r) =>
      r.equipment_type === 'cardio' ? '—' : formatThousands(Math.round(r.totalVolume)),
  },
  {
    id: 'total_cardio_time',
    label: 'Cardio time',
    align: 'right',
    sortValue: (r) => r.totalCardioSeconds,
    render: (r) =>
      r.equipment_type === 'cardio' && r.totalCardioSeconds > 0
        ? formatDuration(r.totalCardioSeconds)
        : '—',
  },
  {
    id: 'last_activity',
    label: 'Last activity',
    align: 'left',
    sortValue: (r) => latestTs(r),
    render: (r) => {
      const ts = pickLatest(r.lastSetAt, r.lastScanAt);
      return ts ? fmtRelative(ts) : '—';
    },
  },
  {
    id: 'last_scan',
    label: 'Last scan',
    align: 'left',
    sortValue: (r) => (r.lastScanAt ? new Date(r.lastScanAt).getTime() : 0),
    render: (r) => (r.lastScanAt ? fmtRelative(r.lastScanAt) : '—'),
  },
  {
    id: 'last_set',
    label: 'Last set',
    align: 'left',
    sortValue: (r) => (r.lastSetAt ? new Date(r.lastSetAt).getTime() : 0),
    render: (r) => (r.lastSetAt ? fmtRelative(r.lastSetAt) : '—'),
  },
  {
    id: 'created',
    label: 'Created',
    align: 'left',
    sortValue: (r) => new Date(r.created_at).getTime(),
    render: (r) =>
      new Date(r.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
  },
  {
    id: 'qr_slug',
    label: 'Slug',
    align: 'left',
    sortValue: (r) => r.qr_slug,
    render: (r) => r.qr_slug,
  },
];

export const DEFAULT_COLUMN_IDS: ColumnId[] = [
  'name',
  'type',
  'set_count',
  'last_activity',
];

const STORAGE_KEY_COLUMNS = 'reptag_owner_equipment_columns_v1';
const STORAGE_KEY_VIEW = 'reptag_owner_equipment_view_v1';

export function loadColumnIds(): ColumnId[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMN_IDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNS);
    if (!raw) return DEFAULT_COLUMN_IDS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_COLUMN_IDS;
    const valid = parsed.filter(
      (id): id is ColumnId => ALL_COLUMNS.some((c) => c.id === id),
    );
    // Always ensure required columns are present.
    for (const c of ALL_COLUMNS) {
      if (c.required && !valid.includes(c.id)) valid.unshift(c.id);
    }
    return valid.length > 0 ? valid : DEFAULT_COLUMN_IDS;
  } catch {
    return DEFAULT_COLUMN_IDS;
  }
}

export function saveColumnIds(ids: ColumnId[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(ids));
  } catch {
    /* private mode */
  }
}

export type ViewMode = 'cards' | 'table';

export function loadViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'cards';
  try {
    const v = localStorage.getItem(STORAGE_KEY_VIEW);
    return v === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

export function saveViewMode(mode: ViewMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_VIEW, mode);
  } catch {
    /* */
  }
}

function latestTs(r: EquipmentTableRow): number {
  const a = r.lastSetAt ? new Date(r.lastSetAt).getTime() : 0;
  const b = r.lastScanAt ? new Date(r.lastScanAt).getTime() : 0;
  return Math.max(a, b);
}

function pickLatest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function formatThousands(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function fmtRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - t) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 60 * 60) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 60 * 60 * 24) return `${Math.round(diffSec / 3600)}h ago`;
  if (diffSec < 60 * 60 * 24 * 7) return `${Math.round(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Re-export so the table can show cardio rows with miles.
export { formatMiles };
