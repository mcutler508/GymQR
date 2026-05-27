type Row = { feature: string; reptag: boolean | string; sheet: boolean | string; app: boolean | string };

const ROWS: Row[] = [
  { feature: 'Set-up time', reptag: '< 5 min', sheet: 'Hours', app: 'Days' },
  { feature: 'Per-machine memory', reptag: true, sheet: false, app: 'Some' },
  { feature: 'Members log without an app', reptag: true, sheet: false, app: false },
  { feature: 'Owner sees aggregate analytics', reptag: true, sheet: 'Manual', app: 'Sometimes' },
  { feature: 'Member privacy by default', reptag: true, sheet: 'No', app: 'Varies' },
  { feature: 'Hardware required', reptag: 'None', sheet: 'None', app: 'Per-rig display' },
  { feature: 'Cost per gym / month', reptag: '$49', sheet: 'Free, but unusable', app: '$200+' },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
        ✓
      </span>
    );
  }
  if (v === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-line/40 text-muted">
        —
      </span>
    );
  }
  return <span className="text-sm text-muted-strong">{v}</span>;
}

export function ComparisonTable() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <header className="max-w-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          Compared
        </div>
        <h2 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          The other options aren&rsquo;t close.
        </h2>
      </header>

      <div className="mt-12 overflow-hidden rounded-card border border-line/70 bg-surface/60 backdrop-blur-sm">
        <div className="grid grid-cols-[1.4fr_1.1fr_1fr_1fr] items-center border-b border-line/70 bg-surface-2/60 px-6 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Feature
          </div>
          <div className="ring-gradient relative -my-2 -mx-2 rounded-card bg-canvas/60 px-3 py-2 text-center font-display text-lg text-ink">
            RepetoIQ
          </div>
          <div className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Spreadsheet
          </div>
          <div className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Dedicated app
          </div>
        </div>
        {ROWS.map((row, i) => (
          <div
            key={row.feature}
            className={`grid grid-cols-[1.4fr_1.1fr_1fr_1fr] items-center px-6 py-4 ${
              i % 2 === 1 ? 'bg-surface-2/30' : ''
            }`}
          >
            <div className="text-sm text-ink">{row.feature}</div>
            <div className="flex justify-center">
              <Cell v={row.reptag} />
            </div>
            <div className="flex justify-center">
              <Cell v={row.sheet} />
            </div>
            <div className="flex justify-center">
              <Cell v={row.app} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
