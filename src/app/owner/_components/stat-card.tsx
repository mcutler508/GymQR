import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  /** Optional unit / suffix shown small. */
  unit?: string;
  /** If provided, the card becomes a link with a chevron + hover accent. */
  href?: string;
  /** Card emphasis — primary uses serif numerals at display size. */
  emphasis?: 'primary' | 'secondary';
};

export function StatCard({ label, value, unit, href, emphasis = 'primary' }: Props) {
  const inner = (
    <div className="group relative flex h-full flex-col justify-between border border-white/10 bg-zinc-950/50 p-6 transition-all duration-300 hover:border-white/40 hover:bg-zinc-950">
      {/* corner tick — top right */}
      <span
        aria-hidden
        className="absolute right-4 top-4 h-3 w-3 border-r border-t border-white/30 transition-colors group-hover:border-white"
      />
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        {label}
      </div>

      <div className="mt-10 flex items-baseline gap-2">
        <span
          className={
            emphasis === 'primary'
              ? 'font-display text-5xl font-light leading-none tracking-tight text-white tabular-nums md:text-6xl'
              : 'font-display text-3xl font-light leading-none tracking-tight text-white tabular-nums md:text-4xl'
          }
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
            {unit}
          </span>
        )}
      </div>

      {href && (
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-400 transition-colors group-hover:text-white">
          <span>View</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
