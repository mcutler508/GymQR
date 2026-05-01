'use client';

import Link from 'next/link';
import { PhoneFrame } from './phone-frame';
import { ScanMock } from './scan-mock';
import { useScrollY } from './use-scroll-y';

export function Hero() {
  const y = useScrollY();
  const phoneTransform = `translate3d(0, ${(-y * 0.08).toFixed(1)}px, 0)`;

  return (
    <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
      <div className="grid items-center gap-16 md:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/60 px-3 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-strong">
              For gym owners · No hardware
            </span>
          </div>

          <h1 className="mt-6 font-display text-5xl font-medium leading-[0.95] tracking-tight md:text-7xl lg:text-[5.5rem]">
            Turn every machine into a{' '}
            <span className="text-gradient-accent">retention engine.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-strong md:text-xl">
            Stick a QR on each piece of equipment. Members log a set in 8 seconds and
            see their own progression — so the gym they remember is yours.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/owner/sign-up"
              className="shadow-accent-glow group inline-flex items-center gap-2 rounded bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink"
            >
              Start your gym free
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/owner/sign-in"
              className="text-sm text-muted-strong underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Already running a gym? Sign in
            </Link>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line/60 pt-6">
            <Metric value="8s" label="To log a set" />
            <Metric value="$0" label="Hardware cost" />
            <Metric value="11d" label="Avg payback" />
          </dl>
        </div>

        <div
          className="relative mx-auto md:translate-y-0"
          style={{ transform: phoneTransform, willChange: 'transform' }}
        >
          {/* Soft glow behind phone */}
          <div
            aria-hidden
            className="absolute -inset-12 -z-10 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 70%)',
            }}
          />
          <PhoneFrame>
            <ScanMock />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-display text-2xl text-ink md:text-3xl">{value}</dt>
      <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {label}
      </dd>
    </div>
  );
}
