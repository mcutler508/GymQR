'use client';

import { useEffect, useState } from 'react';

type Mode = 'light' | 'dark';

const STORAGE_KEY = 'repetoiq_owner_mode';
const COOKIE_NAME = 'repetoiq_owner_mode';

function applyMode(mode: Mode) {
  // Scope the attribute to the owner shell so light mode does not leak
  // into other routes (member /scan, marketing /) within the same tab.
  const shell = document.getElementById('owner-shell');
  if (!shell) return;
  if (mode === 'light') shell.setAttribute('data-mode', 'light');
  else shell.removeAttribute('data-mode');
}

function writeCookie(mode: Mode) {
  // One year, root path. Lets the server-render set data-mode on first paint.
  document.cookie = `${COOKIE_NAME}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function LightModeToggle({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  // Read localStorage post-mount in case it diverges from the cookie
  // (e.g. user toggled in another tab). Cookie is source of truth for SSR.
  useEffect(() => {
    const stored = (typeof window !== 'undefined' && (window.localStorage.getItem(STORAGE_KEY) as Mode | null)) || null;
    if (stored && stored !== mode) {
      setMode(stored);
      applyMode(stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next: Mode = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    applyMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode etc. — cookie is still set */
    }
    writeCookie(next);
  }

  const isLight = mode === 'light';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-zinc-400 transition-colors hover:border-white/40 hover:text-white"
    >
      {isLight ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

/**
 * Pre-hydration script: reads localStorage and reconciles the owner-shell's
 * data-mode attribute before the first paint. The server already set the
 * attribute from the cookie; this catches the rare case where localStorage
 * (e.g. updated in another tab) diverges from the cookie.
 */
export const lightModeBootScript = `
(function(){
  try {
    var m = localStorage.getItem('${STORAGE_KEY}');
    var shell = document.getElementById('owner-shell');
    if (!shell) return;
    if (m === 'light') shell.setAttribute('data-mode','light');
    else if (m === 'dark') shell.removeAttribute('data-mode');
  } catch (e) {}
})();
`;

export const LIGHT_MODE_COOKIE = COOKIE_NAME;
