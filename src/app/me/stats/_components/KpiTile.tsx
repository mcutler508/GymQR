import Link from 'next/link';
import { DeltaIndicator, type Delta } from './DeltaIndicator';

type Props = {
  label: string;
  value: string;
  sublabel?: string;
  delta?: Delta | null;
  accent?: boolean;
  href?: string;
};

/**
 * Borderless KPI tile. The grid gap and whitespace do the visual separation —
 * no boxes, no borders, no card chrome. Strong/Hevy style: the typography is
 * the design.
 *
 * When `href` is set, the tile renders as a Link with a small `›` glyph on
 * the label so the affordance is visible without adding a box around it.
 */
export function KpiTile({ label, value, sublabel, delta, accent, href }: Props) {
  const content = (
    <>
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
        {label}
        {href && (
          <span aria-hidden className="ml-1.5 text-muted-strong">
            ›
          </span>
        )}
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
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block py-1 transition-opacity active:opacity-70 hover:opacity-90"
      >
        {content}
      </Link>
    );
  }
  return <div className="py-1">{content}</div>;
}
