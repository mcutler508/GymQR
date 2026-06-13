import { DeltaIndicator, type Delta } from './DeltaIndicator';

type Props = {
  label: string;
  value: string;
  sublabel?: string;
  delta?: Delta | null;
  accent?: boolean;
};

/**
 * Borderless KPI tile. The grid gap and whitespace do the visual separation —
 * no boxes, no borders, no card chrome. Strong/Hevy style: the typography is
 * the design.
 */
export function KpiTile({ label, value, sublabel, delta, accent }: Props) {
  return (
    <div className="py-1">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
        {label}
      </p>
      <p
        className={[
          'mt-2 font-display tabular-nums leading-none',
          accent ? 'text-accent' : 'text-ink',
          'halogen:text-3xl halogen:font-medium',
          'concrete:text-4xl concrete:font-black',
          'locker:text-2xl locker:font-semibold',
          'athletic:text-3xl athletic:font-black athletic:italic',
        ].join(' ')}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted">
          {sublabel}
        </p>
      )}
      {delta && <DeltaIndicator {...delta} />}
    </div>
  );
}
