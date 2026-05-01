import { PhoneFrame } from './phone-frame';
import { StatsMock } from './stats-mock';

export function MemberExperience() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="grid items-center gap-16 md:grid-cols-[1fr_1.1fr]">
        <div className="order-2 md:order-1">
          <div
            aria-hidden
            className="relative mx-auto"
            style={{
              filter: 'drop-shadow(0 30px 80px rgb(0 0 0 / 0.5))',
            }}
          >
            <div
              aria-hidden
              className="absolute -inset-12 -z-10 rounded-full opacity-50 blur-3xl"
              style={{
                background:
                  'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 70%)',
              }}
            />
            <PhoneFrame>
              <StatsMock />
            </PhoneFrame>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            Member side
          </div>
          <h2 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
            They see progress.
            <br />
            <span className="text-muted-strong">You see retention.</span>
          </h2>
          <p className="mt-5 max-w-xl text-muted-strong md:text-lg">
            Every member gets a private record of every lift, on every machine. Lifetime
            volume, weekly streaks, per-machine PRs, twelve-week progressions — built for
            the locker-room glance, not a tab they&rsquo;ll never open again.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              {
                t: 'Private by default',
                d: 'Each member sees their own data. Owners see aggregates. No leaderboards, no shame.',
              },
              {
                t: 'Suggested next set',
                d: 'Simple +5 lb / +1 rep heuristic. No coach-y ML — just the nudge that keeps them moving.',
              },
              {
                t: 'Streaks they can feel',
                d: 'Weekly cadence rolls into a streak count members open the app to protect.',
              },
            ].map((row) => (
              <li key={row.t} className="flex gap-4">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div>
                  <div className="font-medium text-ink">{row.t}</div>
                  <div className="mt-1 text-sm text-muted-strong">{row.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
