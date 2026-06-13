'use client';

import type { TooltipContentProps } from 'recharts';

// Recharts wires the runtime props (payload, active, label, ...) when it
// renders the tooltip element internally — TS sees those as missing at the
// call site. Treat them as optional and require only the formatter callbacks.
type Props = Partial<TooltipContentProps<number, string>> & {
  formatLabel?: (label: string | number) => string;
  formatValue: (
    value: number,
    payload: Record<string, unknown> | undefined,
  ) => { primary: string; secondary?: string };
};

/**
 * Single Recharts tooltip used across ActivityChart, ProgressionChart, and
 * CardioProgressionChart. Pulls every color from theme CSS vars so it matches
 * the active gym theme without per-theme overrides.
 */
export function ChartTooltip({ active, payload, label, formatLabel, formatValue }: Props) {
  if (!active || !payload || payload.length === 0) return null;
  const first = payload[0];
  const value = typeof first.value === 'number' ? first.value : Number(first.value);
  const row = formatValue(value, first.payload as Record<string, unknown> | undefined);
  const labelText = formatLabel ? formatLabel(label ?? '') : String(label ?? '');
  return (
    <div
      style={{
        background: 'rgb(var(--surface-2))',
        border: '1px solid rgb(var(--line))',
        borderRadius: 'var(--radius)',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
      }}
    >
      {labelText && (
        <p
          style={{
            color: 'rgb(var(--muted))',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: 4,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {labelText}
        </p>
      )}
      <p
        style={{
          color: 'rgb(var(--ink))',
          fontSize: '13px',
          fontVariantNumeric: 'tabular-nums',
          margin: 0,
          fontWeight: 500,
        }}
      >
        {row.primary}
      </p>
      {row.secondary && (
        <p
          style={{
            color: 'rgb(var(--muted-strong))',
            fontSize: '11px',
            margin: 0,
            marginTop: 2,
          }}
        >
          {row.secondary}
        </p>
      )}
    </div>
  );
}
