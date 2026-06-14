import Link from 'next/link';
import { DeltaIndicator, type Delta } from './DeltaIndicator';

type Props = {
  label: string;
  value: string;
  sublabel?: string;
  delta?: Delta | null;
  accent?: boolean;
  href?: string;
  /** Short mono caption shown top-right when `href` is set (e.g. "BY BODY PART"). */
  hrefLabel?: string;
};

/**
 * Borderless KPI tile. The grid gap and whitespace do the visual separation —
 * no boxes, no borders, no card chrome. Strong/Hevy style: the typography is
 * the design.
 *
 * When `href` is set, the tile renders as a Link and shows a top-right caption
 * (`hrefLabel ›`, accent-colored) so the tap affordance is unambiguous without
 * boxing the tile.
 */
export function KpiTile({ label, value, sublabel, delta, accent, href, hrefLabel }: Props) {
  const content = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          {label}
        </p>
        {href && (
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent font-medium whitespace-nowrap">
            {hrefLabel ?? 'View'} <span aria-hidden>›</span>
          </p>
        )}
      </div>
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
