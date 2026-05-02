import type { EquipmentType } from '@/lib/supabase';
import { formatDuration, formatMiles } from '@/lib/cardio';
import { fmtRelative, formatThousands } from '@/lib/equipment-columns';

/**
 * One row per machine × exercise. Single + cardio collapse to a single row
 * with `exerciseName: null`. Multi machines fan out: one row per exercise.
 */
export type MemberStatRow = {
  id: string;                   // unique row id (machine id, or `${machineId}::${exerciseName}`)
  equipmentId: string;          // for the detail-page link
  machineName: string;
  machineLabel: string | null;
  equipmentType: EquipmentType;
  exerciseName: string | null;  // null for single + cardio + multi-unlabeled

  setCount: number;
  prWeight: number | null;
  prReps: number | null;
  lastLoggedAt: string | null;
  totalVolume: number;          // strength only

  longestCardioSeconds: number; // cardio only
  longestCardioMeters: number;

  weekSetCount: number;         // sets in last 7 days
  monthSetCount: number;        // sets in last 30 days
};

export type ColumnId =
  | 'name'
  | 'type'
  | 'set_count'
  | 'pr'
  | 'last_lifted'
  | 'total_volume'
  | 'longest_cardio'
  | 'week_sets'
  | 'month_sets';

export type ColumnDef = {
  id: ColumnId;
  label: string;
  align: 'left' | 'right';
  sortValue: (row: MemberStatRow) => string | number;
  render: (row: MemberStatRow) => string;
  required?: boolean;
};

const TYPE_LABEL: Record<EquipmentType, string> = {
  strength_single: 'Single',
  strength_multi: 'Multi',
  cardio: 'Cardio',
};

export const ALL_COLUMNS: ColumnDef[] = [
  {
    id: 'name',
    label: 'Machine',
    align: 'left',
    required: true,
    sortValue: (r) =>
      `${r.machineName.toLowerCase()}::${(r.exerciseName ?? '').toLowerCase()}`,
    render: (r) =>
      r.exerciseName ? `${r.machineName} · ${r.exerciseName}` : r.machineName,
  },
  {
    id: 'type',
    label: 'Type',
    align: 'left',
    sortValue: (r) => TYPE_LABEL[r.equipmentType],
    render: (r) => TYPE_LABEL[r.equipmentType],
  },
  {
    id: 'set_count',
    label: 'Sets',
    align: 'right',
    sortValue: (r) => r.setCount,
    render: (r) => String(r.setCount),
  },
  {
    id: 'pr',
    label: 'PR',
    align: 'right',
    // Encode "weight × reps" as a single number for stable numeric sort:
    // big weight wins; ties broken by reps. Cardio rows sort to bottom.
    sortValue: (r) =>
      r.prWeight != null && r.prReps != null
        ? r.prWeight * 1000 + r.prReps
        : -1,
    render: (r) =>
      r.prWeight != null && r.prReps != null
        ? `${fmtWeight(r.prWeight)} × ${r.prReps}`
        : '—',
  },
  {
    id: 'last_lifted',
    label: 'Last lifted',
    align: 'left',
    sortValue: (r) =>
      r.lastLoggedAt ? new Date(r.lastLoggedAt).getTime() : 0,
    render: (r) => (r.lastLoggedAt ? fmtRelative(r.lastLoggedAt) : '—'),
  },
  {
    id: 'total_volume',
    label: 'Volume (lbs)',
    align: 'right',
    sortValue: (r) => r.totalVolume,
    render: (r) =>
      r.equipmentType === 'cardio' ? '—' : formatThousands(Math.round(r.totalVolume)),
  },
  {
    id: 'longest_cardio',
    label: 'Longest',
    align: 'right',
    sortValue: (r) => r.longestCardioSeconds,
    render: (r) => {
      if (r.equipmentType !== 'cardio' || r.longestCardioSeconds <= 0) return '—';
      const dur = formatDuration(r.longestCardioSeconds);
      if (r.longestCardioMeters > 0) {
        return `${dur} · ${formatMiles(r.longestCardioMeters)} mi`;
      }
      return dur;
    },
  },
  {
    id: 'week_sets',
    label: 'This week',
    align: 'right',
    sortValue: (r) => r.weekSetCount,
    render: (r) => String(r.weekSetCount),
  },
  {
    id: 'month_sets',
    label: 'Last 30d',
    align: 'right',
    sortValue: (r) => r.monthSetCount,
    render: (r) => String(r.monthSetCount),
  },
];

export const DEFAULT_COLUMN_IDS: ColumnId[] = [
  'name',
  'type',
  'set_count',
  'pr',
  'last_lifted',
];

const STORAGE_KEY_COLUMNS = 'reptag_member_stats_columns_v1';
const STORAGE_KEY_VIEW = 'reptag_member_stats_view_v1';

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
  if (typeof window === 'undefined') return 'table';
  try {
    const v = localStorage.getItem(STORAGE_KEY_VIEW);
    return v === 'cards' ? 'cards' : 'table';
  } catch {
    return 'table';
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

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}
