import { Reveal } from './reveal';

type Benefit = {
  kicker: string;
  title: string;
  blurb: string;
  bullets: { stat: string; label: string }[];
};

const BENEFITS: Benefit[] = [
  {
    kicker: 'Retention',
    title: 'Members who track, stay.',
    blurb:
      'A member who logs sets at your gym builds a record they don\'t want to lose. That record is your moat.',
    bullets: [
      { stat: '20%', label: 'Lower 90-day churn vs. untracked members' },
      { stat: '3.4×', label: 'More likely to renew after their first PR' },
      { stat: '6mo+', label: 'Average extension on lifetime value' },
    ],
  },
  {
    kicker: 'Acquisition',
    title: 'Trial members convert.',
    blurb:
      'New members feel progress in week one. The QR makes the gym feel modern without changing how anyone trains.',
    bullets: [
      { stat: '+18%', label: 'Trial-to-paid conversion lift' },
      { stat: '0', label: 'Equipment to install or maintain' },
      { stat: '<5min', label: 'To print and place every sticker' },
    ],
  },
  {
    kicker: 'Insight',
    title: 'See your floor, finally.',
    blurb:
      'Aggregate scan and set counts show exactly which machines earn their footprint — and which to retire.',
    bullets: [
      { stat: 'Live', label: 'Daily scans, sets, and unique users' },
      { stat: 'Per-rig', label: 'Usage badges and last-scan timestamps' },
      { stat: 'Private', label: 'Owners see totals, not individual lifts' },
    ],
  },
];

export function BenefitCards() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <header className="max-w-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          Why owners ship it
        </div>
        <h2 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          Three outcomes you can put on a P&amp;L.
        </h2>
      </header>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {BENEFITS.map((b, i) => (
          <Reveal
            key={b.kicker}
            delay={i * 80}
            className="ring-gradient group relative rounded-card bg-surface/70 p-7 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              {b.kicker}
            </div>
            <h3 className="mt-3 font-display text-2xl leading-tight md:text-[1.75rem]">
              {b.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-strong">{b.blurb}</p>

            <ul className="mt-6 space-y-3 border-t border-line/60 pt-5">
              {b.bullets.map((row) => (
                <li key={row.label} className="flex items-baseline gap-3">
                  <span className="min-w-[3.5rem] font-display text-lg text-accent">
                    {row.stat}
                  </span>
                  <span className="text-sm text-muted-strong">{row.label}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
