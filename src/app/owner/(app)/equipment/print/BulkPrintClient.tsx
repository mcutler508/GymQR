'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

type Sticker = {
  id: string;
  qrSlug: string;
  name: string;
  machineLabel: string | null;
  scanUrl: string;
};

type Props = {
  stickers: Sticker[];
  gymName: string;
  gymTheme: string;
  tagline: string;
  taglinePosition: 'top' | 'bottom';
};

const THEME_ACCENT: Record<string, string> = {
  halogen: '#F5D547',
  concrete: '#F97316',
  'locker-room': '#059669',
  athletic: '#65A30D',
};

const DUMBBELL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="3" y="36" width="11" height="28" rx="3" fill="#0a0a0a"/>
  <rect x="14" y="32" width="8" height="36" rx="2" fill="#0a0a0a"/>
  <rect x="22" y="44" width="56" height="12" rx="2" fill="#0a0a0a"/>
  <rect x="78" y="32" width="8" height="36" rx="2" fill="#0a0a0a"/>
  <rect x="86" y="36" width="11" height="28" rx="3" fill="#0a0a0a"/>
</svg>`.trim();

const LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DUMBBELL_SVG)}`;

export function BulkPrintClient({
  stickers,
  gymName,
  gymTheme,
  tagline,
  taglinePosition,
}: Props) {
  const accent = THEME_ACCENT[gymTheme] ?? THEME_ACCENT.halogen;
  const trimmedTagline = tagline.trim();

  return (
    <div>
      {/*
        Scoped print styles. Every .sticker is normally hidden by the global
        rule (body * { visibility: hidden }) outside of the single-sticker page,
        and that same rule does the right thing here — .sticker children stay
        visible. We just need to override the position-absolute layout from
        globals.css so each sticker prints on its own page.
      */}
      <style>{`
        @media print {
          .bulk-print-grid .sticker {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            margin: 0 auto !important;
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
          }
          .bulk-print-grid .sticker:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {/* ── Toolbar (not printed) ────────────────────────────── */}
      <div className="no-print mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          Bulk print · {stickers.length} {stickers.length === 1 ? 'sticker' : 'stickers'}
        </div>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Print selected stickers
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Each sticker prints on its own page. Use your browser&apos;s print preview to confirm before printing.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-none border border-white bg-white px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-black transition-colors hover:bg-black hover:text-white"
          >
            Print all
          </button>
          <Link
            href="/owner/equipment"
            className="flex items-center rounded-none px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-white"
          >
            ← Back to equipment
          </Link>
        </div>
      </div>

      {/* ── Stickers ─────────────────────────────────────────── */}
      <div className="bulk-print-grid space-y-8">
        {stickers.map((s) => (
          <BulkSticker
            key={s.id}
            sticker={s}
            gymName={gymName}
            accent={accent}
            tagline={trimmedTagline}
            taglinePosition={taglinePosition}
          />
        ))}
      </div>
    </div>
  );
}

function BulkSticker({
  sticker,
  gymName,
  accent,
  tagline,
  taglinePosition,
}: {
  sticker: Sticker;
  gymName: string;
  accent: string;
  tagline: string;
  taglinePosition: 'top' | 'bottom';
}) {
  const showTagline = tagline.length > 0;
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Resolve any relative scan URL on mount.
  const scanUrlRef = useRef(sticker.scanUrl);
  useEffect(() => {
    if (!sticker.scanUrl.startsWith('http')) {
      scanUrlRef.current = `${window.location.origin}/scan/${sticker.qrSlug}`;
    }
  }, [sticker.qrSlug, sticker.scanUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const { default: QRCodeStyling } = await import('qr-code-styling');
      if (cancelled || !containerRef.current) return;

      containerRef.current.innerHTML = '';

      const qr = new QRCodeStyling({
        width: 600,
        height: 600,
        type: 'canvas',
        data: scanUrlRef.current,
        image: LOGO_DATA_URL,
        margin: 0,
        qrOptions: { errorCorrectionLevel: 'H' },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.22,
          margin: 6,
          crossOrigin: 'anonymous',
        },
        dotsOptions: { color: '#0a0a0a', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' },
        cornersSquareOptions: { color: accent, type: 'extra-rounded' },
        cornersDotOptions: { color: '#0a0a0a', type: 'dot' },
      });

      qr.append(containerRef.current);
    })();

    return () => {
      cancelled = true;
    };
  }, [accent, sticker.qrSlug]);

  return (
    <div className="sticker mx-auto flex max-w-md flex-col items-center rounded-2xl bg-white p-10 text-center text-black shadow-[0_20px_60px_-20px_rgb(0_0_0_/_0.6)]">
      <p
        className="font-mono text-[10px] uppercase tracking-[0.32em]"
        style={{ color: accent }}
      >
        Scan to track
      </p>
      <h2 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight">
        {sticker.name}
      </h2>
      {sticker.machineLabel && (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
          № {sticker.machineLabel}
        </p>
      )}

      {showTagline && taglinePosition === 'top' && (
        <p className="mt-4 font-display text-sm italic text-neutral-600">
          {tagline}
        </p>
      )}

      <div ref={containerRef} className="my-7" />

      <div className="flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-neutral-300" />
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-500">
          {gymName}
        </span>
        <span className="h-px flex-1 bg-neutral-300" />
      </div>
      {showTagline && taglinePosition === 'bottom' && (
        <p className="mt-3 font-display text-sm italic text-neutral-600">
          {tagline}
        </p>
      )}
    </div>
  );
}
