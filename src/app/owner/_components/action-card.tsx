import Link from 'next/link';

type Props = {
  /** "01" / "02" — typeset in mono caps. */
  index: string;
  title: string;
  blurb: string;
  href: string;
};

/**
 * Editorial action entry. Looks like a numbered chapter heading rather
 * than a generic card. Hover reveals a thin accent rule under the title.
 */
export function ActionCard({ index, title, blurb, href }: Props) {
  return (
    <Link
      href={href}
      className="group block border-b border-white/10 py-7 transition-colors hover:border-white/40"
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition-colors group-hover:text-white">
          {index}
        </span>

        <div>
          <div className="relative inline-block">
            <h3 className="font-display text-2xl font-light tracking-tight text-white md:text-3xl">
              {title}
            </h3>
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-500 group-hover:scale-x-100"
            />
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">{blurb}</p>
        </div>

        <span className="font-mono text-xl text-zinc-500 transition-all group-hover:translate-x-1 group-hover:text-white">
          →
        </span>
      </div>
    </Link>
  );
}
