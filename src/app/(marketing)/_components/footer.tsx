import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative mt-16">
      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-line to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-lg">RepTag</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Your gym remembers your lifts
          </span>
        </div>
        <nav className="flex items-center gap-6 text-muted-strong">
          <Link href="/owner/sign-up" className="hover:text-ink">
            Sign up
          </Link>
          <Link href="/owner/sign-in" className="hover:text-ink">
            Sign in
          </Link>
          <Link href="/scan" className="hover:text-ink">
            Scan
          </Link>
        </nav>
      </div>
    </footer>
  );
}
