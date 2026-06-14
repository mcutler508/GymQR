'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/scan', label: 'Scan', match: (p: string) => p === '/scan', icon: 'scan' as const },
  { href: '/me/stats', label: 'Stats', match: (p: string) => p === '/me/stats' || p.startsWith('/me/stats/'), icon: 'stats' as const },
  { href: '/me/history', label: 'History', match: (p: string) => p.startsWith('/me/history'), icon: 'history' as const },
  { href: '/me/profile', label: 'Profile', match: (p: string) => p.startsWith('/me/profile'), icon: 'profile' as const },
];

/**
 * Mobile bottom nav for the member persona. Fixed at the bottom across the
 * shell pages AND the camera page (`/scan`) — so the four-tab map stays visible
 * everywhere a member normally lives. Deep scan-log flow (`/scan/[qrSlug]`)
 * intentionally does NOT render this, so the log loop stays distraction-free.
 */
export function MemberBottomNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav
      aria-label="Member navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex flex-col items-center justify-center gap-1 py-2.5 transition-colors',
                  active ? 'text-accent' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                <NavIcon name={tab.icon} />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em]">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavIcon({ name }: { name: 'scan' | 'stats' | 'history' | 'profile' }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'scan') {
    return (
      <svg {...common}>
        <path d="M4 8V6a2 2 0 0 1 2-2h2" />
        <path d="M20 8V6a2 2 0 0 0-2-2h-2" />
        <path d="M4 16v2a2 2 0 0 0 2 2h2" />
        <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
        <path d="M4 12h16" />
      </svg>
    );
  }
  if (name === 'stats') {
    return (
      <svg {...common}>
        <path d="M5 21V11" />
        <path d="M12 21V3" />
        <path d="M19 21V14" />
      </svg>
    );
  }
  if (name === 'history') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}
