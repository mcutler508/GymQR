'use client';

import { useEffect, useRef, useState } from 'react';

const SUBSCRIPTION_PRICE = 49; // $/mo, illustrative
const STICKER_COST = 0; // print at home
const CHURN_REDUCTION = 0.2; // RepTag reduces churn by 20% (defensible footnote on page)
const AVG_MONTHS_RETAINED = 6;

function useEased(value: number, duration = 600) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = display;
    fromRef.current = from;
    startRef.current = null;
    const target = value;

    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}

export function RoiCalculator() {
  const [members, setMembers] = useState(200);
  const [fee, setFee] = useState(60);
  const [churn, setChurn] = useState(5); // monthly %, integer

  const monthlyChurn = churn / 100;
  const membersSavedPerYear = members * monthlyChurn * CHURN_REDUCTION * 12;
  const annualRevenueRetained =
    membersSavedPerYear * fee * AVG_MONTHS_RETAINED;
  const dailyRevenueRetained = annualRevenueRetained / 365;
  const yearlyCost = SUBSCRIPTION_PRICE * 12 + STICKER_COST;
  const paybackDays =
    dailyRevenueRetained > 0
      ? Math.max(1, Math.round(yearlyCost / dailyRevenueRetained))
      : 0;

  const easedSaved = useEased(membersSavedPerYear);
  const easedRevenue = useEased(annualRevenueRetained);
  const easedPayback = useEased(paybackDays);

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <header className="max-w-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          The math
        </div>
        <h2 className="mt-3 font-display text-4xl leading-tight md:text-6xl">
          Run your own numbers.
        </h2>
        <p className="mt-4 text-muted-strong md:text-lg">
          Drag the sliders. RepTag pays for itself the moment a single member sticks
          around one extra month.
        </p>
      </header>

      <div className="ring-gradient mt-12 grid gap-10 rounded-card bg-surface/70 p-8 backdrop-blur-sm md:grid-cols-[1fr_1.1fr] md:p-12">
        <div className="space-y-8">
          <Slider
            label="Members"
            min={50}
            max={2000}
            step={10}
            value={members}
            onChange={setMembers}
            format={(v) => v.toLocaleString()}
          />
          <Slider
            label="Monthly fee per member"
            min={20}
            max={300}
            step={1}
            value={fee}
            onChange={setFee}
            format={(v) => `$${v}`}
          />
          <Slider
            label="Current monthly churn"
            min={1}
            max={10}
            step={1}
            value={churn}
            onChange={setChurn}
            format={(v) => `${v}%`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1">
          <Result
            label="Members saved / year"
            value={Math.round(easedSaved).toLocaleString()}
          />
          <Result
            label="Annual revenue retained"
            value={`$${Math.round(easedRevenue).toLocaleString()}`}
            highlight
          />
          <Result
            label="Payback period"
            value={
              paybackDays > 0
                ? `${Math.round(easedPayback)} day${paybackDays === 1 ? '' : 's'}`
                : '—'
            }
          />
        </div>
      </div>

      <p className="mt-6 max-w-3xl font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Assumptions: 20% relative churn reduction, 6-month average retained tenure per saved
        member, ${SUBSCRIPTION_PRICE}/mo subscription. Adjust to fit your gym — the model is
        deliberately conservative.
      </p>
    </section>
  );
}

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
};

function Slider({ label, min, max, step, value, onChange, format }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {label}
        </span>
        <span className="font-display text-2xl text-ink">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="roi-slider mt-3 w-full"
        style={{
          background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${pct}%, rgb(var(--line)) ${pct}%, rgb(var(--line)) 100%)`,
        }}
      />
      <style jsx>{`
        .roi-slider {
          appearance: none;
          height: 4px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
        }
        .roi-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: rgb(var(--ink));
          border: 2px solid rgb(var(--accent));
          box-shadow: 0 0 0 4px rgb(var(--accent) / 0.15);
          cursor: grab;
          transition: transform 120ms ease;
        }
        .roi-slider::-webkit-slider-thumb:active {
          transform: scale(1.1);
          cursor: grabbing;
        }
        .roi-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: rgb(var(--ink));
          border: 2px solid rgb(var(--accent));
          box-shadow: 0 0 0 4px rgb(var(--accent) / 0.15);
          cursor: grab;
        }
      `}</style>
    </label>
  );
}

function Result({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-card border p-6 ${
        highlight
          ? 'border-accent/50 bg-accent/5'
          : 'border-line/70 bg-surface-2/60'
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        {label}
      </div>
      <div
        className={`mt-2 font-display leading-none ${
          highlight ? 'text-accent text-4xl md:text-5xl' : 'text-ink text-3xl md:text-4xl'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
