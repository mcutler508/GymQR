type Props = {
  /** Mono caps eyebrow line — gym slug, date, or status. */
  kicker: string;
  /** Big serif gym name. */
  title: string;
  /** Italic serif tagline beneath the headline. */
  subtitle?: string;
  /** Right-side meta (current date, today summary, etc.). */
  meta?: React.ReactNode;
};

/**
 * Newspaper-masthead style header. Massive Fraunces display, hairline
 * top + bottom rules, mono caps date stamp on the right.
 */
export function EditorialHeader({ kicker, title, subtitle, meta }: Props) {
  return (
    <header>
      <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          {kicker}
        </span>
        {meta && (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            {meta}
          </span>
        )}
      </div>

      <h1 className="mt-6 font-display font-light leading-[1] tracking-tight text-white text-[clamp(2rem,4vw,3rem)]">
        {title}
      </h1>

      {subtitle && (
        <p className="mt-3 max-w-xl font-display text-lg italic leading-relaxed text-zinc-400">
          {subtitle}
        </p>
      )}

      <div className="mt-6 h-px w-full bg-gradient-to-r from-white/40 via-white/10 to-transparent" />
    </header>
  );
}
