import Image from 'next/image';
import Link from 'next/link';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/repetoIQicon.png"
            alt="repetoIQ"
            width={40}
            height={40}
            priority
            className="h-10 w-10"
          />
          <span className="font-display text-xl tracking-tight lowercase">repetoIQ</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted sm:inline">
            for gyms
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/owner/sign-in"
            className="hidden text-muted-strong transition-colors hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/owner/sign-up"
            className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink transition-transform hover:-translate-y-px"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MemberHint() {
  return (
    <div className="border-b border-line/60 bg-surface/60 py-2 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
      Members — just scan the QR sticker on your machine.
    </div>
  );
}
