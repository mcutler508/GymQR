const TYPES = [
  { label: 'Independent gyms', icon: 'dumbbell' as const },
  { label: 'CrossFit boxes', icon: 'kettlebell' as const },
  { label: 'PT studios', icon: 'plate' as const },
  { label: 'Climbing & rec', icon: 'climb' as const },
];

function Icon({ name }: { name: 'dumbbell' | 'kettlebell' | 'plate' | 'climb' }) {
  const common = 'h-5 w-5 text-muted-strong';
  if (name === 'dumbbell') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path
          d="M3 10v4M6 7v10M9 9v6h6V9M18 7v10M21 10v4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === 'kettlebell') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path
          d="M9 5h6M10 5v2a4 4 0 1 0 4 0V5M7 13a5 5 0 1 0 10 0"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === 'plate') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common}>
      <path
        d="M5 20l5-7 4 4 5-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrustStrip() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-16">
      <div className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        Built for
      </div>
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {TYPES.map((t) => (
          <li
            key={t.label}
            className="flex items-center gap-3 text-sm text-muted-strong"
          >
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
