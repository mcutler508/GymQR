import Link from 'next/link';

export function FinalCta() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div
        className="ring-gradient relative overflow-hidden rounded-card bg-surface/70 p-10 text-center backdrop-blur-sm md:p-16"
      >
        {/* Inner gradient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 80% at 50% 0%, rgb(var(--accent) / 0.15), transparent 70%)',
          }}
        />

        <div className="relative">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            Start your gym
          </div>
          <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl leading-[1.05] md:text-6xl">
            Print one sticker tonight.
            <br />
            <span className="text-gradient-accent">Watch the math the next morning.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-muted-strong md:text-lg">
            First 10 members free. No credit card. Cancel any time — but you won&rsquo;t.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/owner/sign-up"
              className="shadow-accent-glow group inline-flex items-center gap-2 rounded bg-accent px-7 py-4 text-sm font-semibold text-accent-ink"
            >
              Create your gym
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/owner/sign-in"
              className="text-sm text-muted-strong underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
