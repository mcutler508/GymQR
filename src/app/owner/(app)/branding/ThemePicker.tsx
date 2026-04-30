'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateGymTheme } from '../../actions';
import type { GymTheme } from '@/app/scan/[qrSlug]/page';

const THEMES: { id: GymTheme; name: string; tagline: string }[] = [
  { id: 'halogen', name: 'Halogen Gym', tagline: 'Dark editorial · serif headlines · single yellow accent' },
  { id: 'concrete', name: 'Concrete & Ember', tagline: 'Industrial · condensed display · ember orange · hard edges' },
  { id: 'locker-room', name: 'Locker Room', tagline: 'Warm light · soft shadows · emerald accent · premium SaaS' },
  { id: 'athletic', name: 'Athletic Neon', tagline: 'High energy · italic display · neon lime · 5am gym' },
];

type Props = { currentTheme: GymTheme; gymName: string };

export function ThemePicker({ currentTheme, gymName }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<GymTheme>(currentTheme);
  const [pending, startTransition] = useTransition();
  const [savedTheme, setSavedTheme] = useState<GymTheme>(currentTheme);
  const [err, setErr] = useState<string | null>(null);

  function pick(theme: GymTheme) {
    if (pending || theme === selected) return;
    setSelected(theme);
    setErr(null);
    startTransition(async () => {
      const res = await updateGymTheme({ theme });
      if (!res.ok) {
        setErr(res.error);
        setSelected(savedTheme);
        return;
      }
      setSavedTheme(theme);
      router.refresh();
    });
  }

  return (
    <div>
      {err && (
        <p className="mt-3 mb-3 text-sm text-red-400">Couldn&apos;t save: {err}</p>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {THEMES.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => pick(t.id)}
              className={[
                'w-full text-left rounded-xl overflow-hidden transition relative',
                'border-2',
                selected === t.id
                  ? 'border-white'
                  : 'border-neutral-800 hover:border-neutral-700',
              ].join(' ')}
            >
              <ThemePreviewCard theme={t.id} gymName={gymName} />
              <div className="p-4 bg-neutral-950">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{t.name}</p>
                  {selected === t.id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white text-black font-medium">
                      {pending ? 'Saving…' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1">{t.tagline}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-neutral-500">
        Members see the theme on their scan and stats pages. The owner dashboard stays in this admin look
        regardless of which theme you pick — so managing the gym always feels the same.
      </p>
    </div>
  );
}

/**
 * Self-contained mini scan-card mock. Wraps in [data-theme] so the live tokens
 * apply — no images, no iframes, just the actual design system.
 */
function ThemePreviewCard({ theme, gymName }: { theme: GymTheme; gymName: string }) {
  return (
    <div data-theme={theme} className="bg-canvas text-ink p-5 aspect-[5/4] flex flex-col justify-between">
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          {gymName}
        </p>
        <h3
          className={[
            'mt-2 font-display tracking-tight leading-none',
            'halogen:text-3xl halogen:font-medium',
            'concrete:text-4xl concrete:font-black concrete:uppercase concrete:leading-[0.85]',
            'locker:text-2xl locker:font-semibold',
            'athletic:text-3xl athletic:font-black athletic:italic athletic:uppercase',
          ].join(' ')}
        >
          Bench Press
        </h3>
      </div>

      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted font-medium">
          Suggested
        </p>
        <p
          className={[
            'mt-1 font-display text-accent leading-none',
            'halogen:text-3xl halogen:italic halogen:font-medium',
            'concrete:text-4xl concrete:font-black',
            'locker:text-2xl locker:font-semibold',
            'athletic:text-4xl athletic:italic athletic:font-black',
          ].join(' ')}
        >
          185 × 8
        </p>
      </div>

      <div
        className={[
          'rounded text-center font-semibold py-2 text-sm bg-accent text-accent-ink',
          'concrete:font-black concrete:uppercase concrete:tracking-[0.05em]',
          'athletic:font-black athletic:italic athletic:uppercase',
        ].join(' ')}
      >
        Save Set
      </div>
    </div>
  );
}
