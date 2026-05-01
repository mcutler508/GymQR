'use client';

import { useEffect, useRef, useState } from 'react';

const STEPS = [
  {
    kicker: '01 · Scan',
    title: 'Tap the sticker',
    body: 'Phone camera opens the page. No app. No login if they\'re already a member.',
  },
  {
    kicker: '02 · See',
    title: 'Their last lift',
    body: 'Last weight × reps for this exact machine. Plus a suggested next target.',
  },
  {
    kicker: '03 · Log',
    title: 'Save the set',
    body: 'Two taps. Done in 8 seconds. They get back to lifting — and back next week.',
  },
];

export function LoopDiagram() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.35 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <header className="max-w-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          The loop
        </div>
        <h2 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          Scan → see last lift → log set → done.
        </h2>
        <p className="mt-4 text-muted-strong md:text-lg">
          Every interaction with your gym becomes a touchpoint members feel — without a
          single piece of hardware on the floor.
        </p>
      </header>

      <div ref={ref} className="relative mt-14">
        {/* Connecting line — desktop only */}
        <svg
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-8 hidden md:block"
          viewBox="0 0 1000 20"
          preserveAspectRatio="none"
          height={20}
        >
          <path
            d="M 40 10 L 960 10"
            stroke="rgb(var(--accent))"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDashoffset: active ? 0 : 1,
              transition: 'stroke-dashoffset 1400ms cubic-bezier(0.22,1,0.36,1)',
              opacity: 0.6,
            }}
          />
        </svg>

        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.kicker}
              className="relative rounded-card border border-line/70 bg-surface/70 p-6 backdrop-blur-sm card-sheen"
              style={{
                opacity: active ? 1 : 0,
                transform: active ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity 600ms ease ${i * 150}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${i * 150}ms`,
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-xs text-accent">
                0{i + 1}
              </div>
              <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                {step.kicker}
              </div>
              <h3 className="mt-2 font-display text-2xl leading-tight">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-strong">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
