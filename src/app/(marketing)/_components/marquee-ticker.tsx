const ITEMS = [
  '+12% retention',
  '8-second set logs',
  '$0 hardware',
  'Members own their data',
  'Print stickers in minutes',
  'Works on any gym wifi',
  'No app to install',
  'Suggested target each scan',
  'Owner analytics, member privacy',
];

export function MarqueeTicker() {
  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-y border-line/60 bg-surface/40 py-5"
    >
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-canvas to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-canvas to-transparent" />

      <div className="marquee-track gap-12">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-12 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-strong"
          >
            <span>{item}</span>
            <span className="h-1 w-1 rounded-full bg-accent/60" />
          </span>
        ))}
      </div>
    </div>
  );
}
