import Link from 'next/link';

type Props = {
  kicker?: string;
  headline: string;
  sublabel: string;
  cta?: { label: string; href: string };
};

export function EmptyState({ kicker, headline, sublabel, cta }: Props) {
  return (
    <div className="p-6 rounded-card border border-dashed border-line bg-surface text-center">
      {kicker && (
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          {kicker}
        </p>
      )}
      <p
        className={[
          'mt-2 font-display text-ink',
          'halogen:text-xl halogen:font-medium',
          'concrete:text-2xl concrete:font-black concrete:uppercase',
          'locker:text-lg locker:font-semibold',
          'athletic:text-xl athletic:font-black athletic:italic athletic:uppercase',
        ].join(' ')}
      >
        {headline}
      </p>
      <p className="mt-2 text-sm text-muted">{sublabel}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-block px-4 py-2 rounded bg-accent text-accent-ink text-sm font-medium"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
