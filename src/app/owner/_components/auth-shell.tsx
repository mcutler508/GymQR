import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  /** Eyebrow line shown above the headline (mono caps). */
  kicker: string;
  /** Big serif headline. */
  title: string;
  /** Italicized serif accent word that completes the title. */
  flourish?: string;
  /** The form. */
  children: ReactNode;
  /** Footer link prompt e.g. "New here?" */
  footerPrompt: string;
  /** Footer link target. */
  footerHref: string;
  /** Footer link label. */
  footerLabel: string;
};

/**
 * Editorial split-shell used by sign-in and sign-up.
 * Pure black + ivory whites + Fraunces serif "calligraphy" — no accent color.
 * Mobile collapses to a single-column stack with the brand panel on top.
 */
export function AuthShell({
  kicker,
  title,
  flourish,
  children,
  footerPrompt,
  footerHref,
  footerLabel,
}: Props) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Soft light source — single radial gloss, pure white, very low opacity. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 25% 20%, rgb(255 255 255 / 0.06), transparent 70%)',
        }}
      />
      {/* Faint film grain via SVG noise — gives the black canvas dimension. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* ── Brand / editorial panel ────────────────────────────── */}
        <aside className="relative flex flex-col justify-between border-b border-white/10 px-8 py-12 sm:px-16 lg:border-b-0 lg:border-r lg:py-16">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/repetoIQicon.png"
                alt="RepetoIQ"
                width={56}
                height={56}
                priority
                className="h-14 w-14"
              />
              <span className="font-display text-2xl tracking-tight">RepetoIQ</span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
              Est. 2026
            </span>
          </div>

          <div className="my-auto py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
              {kicker}
            </div>
            <h1
              className="mt-6 font-display font-light leading-[0.92] tracking-tight text-white"
              style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
            >
              {title}
              {flourish && (
                <>
                  <br />
                  <span className="italic text-zinc-200" style={{ fontWeight: 300 }}>
                    {flourish}
                  </span>
                </>
              )}
            </h1>
          </div>

          <div aria-hidden />
        </aside>

        {/* ── Form panel ─────────────────────────────────────────── */}
        <section className="flex items-center justify-center px-6 py-16 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
              {kicker === 'Welcome back' ? 'Returning owner' : 'New owner'}
            </div>
            <h2 className="mt-3 font-display text-2xl text-white">
              {kicker === 'Welcome back' ? 'Sign in' : 'Open the doors'}
            </h2>
            <div className="mt-1 h-px w-12 bg-white/40" />

            <div className="mt-10">{children}</div>

            <p className="mt-10 text-xs text-zinc-500">
              {footerPrompt}{' '}
              <Link
                href={footerHref}
                className="text-zinc-200 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {footerLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
