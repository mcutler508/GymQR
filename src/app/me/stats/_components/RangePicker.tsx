'use client';

import { RANGE_OPTIONS, type RangeKey } from '@/lib/member-range';

type Props = {
  value: RangeKey;
  onChange: (r: RangeKey) => void;
};

export function RangePicker({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex items-center gap-1 p-1 rounded-card bg-surface border border-line text-xs"
    >
      {RANGE_OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-3 py-1.5 rounded transition-colors ${
              active
                ? 'bg-accent text-accent-ink font-medium'
                : 'text-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
