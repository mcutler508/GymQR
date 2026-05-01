/** Static visual mock of the /scan/[qrSlug] view, sized to fit inside PhoneFrame. */
export function ScanMock() {
  return (
    <div className="flex h-full flex-col px-5 pt-10 pb-5 text-ink">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Leg Press · #04
      </div>
      <h3 className="mt-2 font-display text-2xl leading-tight">
        Welcome back,
        <br />
        <span className="text-accent">Marcus.</span>
      </h3>

      <div className="mt-5 rounded-card border border-line/70 bg-surface-2 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Last lift · 3 days ago
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl">245</span>
          <span className="text-sm text-muted">lb × 8</span>
        </div>
      </div>

      <div className="mt-3 rounded-card border border-accent/40 bg-accent/5 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Suggested
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl text-accent">250</span>
          <span className="text-sm text-muted">lb × 8</span>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <div className="rounded-card border border-line/70 bg-surface-2 p-3 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Weight
          </div>
          <div className="font-display text-xl">250</div>
        </div>
        <div className="rounded-card border border-line/70 bg-surface-2 p-3 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Reps
          </div>
          <div className="font-display text-xl">8</div>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded bg-accent py-3 text-sm font-semibold text-accent-ink"
      >
        Log set
      </button>
    </div>
  );
}
