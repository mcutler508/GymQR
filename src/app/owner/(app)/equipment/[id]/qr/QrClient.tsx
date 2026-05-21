'use client';

import { useEffect, useRef, useState } from 'react';
import type { Equipment } from '@/lib/supabase';

type Props = {
  equipment: Equipment;
  initialScanUrl: string;
  gymName: string;
  gymTheme: string;
  tagline: string;
  taglinePosition: 'top' | 'bottom';
};

/**
 * Per-theme accent color for the QR's corner finder eyes.
 * Dot modules stay near-black for max scan reliability — only the three
 * corner squares carry the brand color, which is the highest-impact /
 * lowest-risk way to brand a QR.
 */
const THEME_ACCENT: Record<string, string> = {
  halogen: '#F5D547',
  concrete: '#F97316',
  'locker-room': '#059669',
  athletic: '#65A30D',
};

/** Inline dumbbell SVG → data URL. Drops into the QR center on a white pill. */
const DUMBBELL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="3" y="36" width="11" height="28" rx="3" fill="#0a0a0a"/>
  <rect x="14" y="32" width="8" height="36" rx="2" fill="#0a0a0a"/>
  <rect x="22" y="44" width="56" height="12" rx="2" fill="#0a0a0a"/>
  <rect x="78" y="32" width="8" height="36" rx="2" fill="#0a0a0a"/>
  <rect x="86" y="36" width="11" height="28" rx="3" fill="#0a0a0a"/>
</svg>`.trim();

const LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DUMBBELL_SVG)}`;

export function QrClient({
  equipment,
  initialScanUrl,
  gymName,
  gymTheme,
  tagline,
  taglinePosition,
}: Props) {
  const trimmedTagline = tagline.trim();
  const showTagline = trimmedTagline.length > 0;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<{
    update: (opts: Record<string, unknown>) => void;
    download: (opts: { name: string; extension: 'png' | 'svg' }) => Promise<void>;
  } | null>(null);
  const [scanUrl, setScanUrl] = useState(initialScanUrl);
  const accent = THEME_ACCENT[gymTheme] ?? THEME_ACCENT.halogen;

  // If page rendered without NEXT_PUBLIC_APP_URL, finalize URL from the browser.
  useEffect(() => {
    if (!initialScanUrl.startsWith('http')) {
      setScanUrl(`${window.location.origin}/scan/${equipment.qr_slug}`);
    }
  }, [equipment.qr_slug, initialScanUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const { default: QRCodeStyling } = await import('qr-code-styling');
      if (cancelled || !containerRef.current) return;

      // Clear previous render (HMR / re-mount safety).
      containerRef.current.innerHTML = '';

      const qr = new QRCodeStyling({
        width: 600,
        height: 600,
        type: 'canvas',
        data: scanUrl,
        image: LOGO_DATA_URL,
        margin: 0,
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.22,
          margin: 6,
          crossOrigin: 'anonymous',
        },
        dotsOptions: {
          color: '#0a0a0a',
          type: 'rounded',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        cornersSquareOptions: {
          color: accent,
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: '#0a0a0a',
          type: 'dot',
        },
      });

      qr.append(containerRef.current);
      qrRef.current = qr as unknown as typeof qrRef.current;
    })();

    return () => {
      cancelled = true;
    };
  }, [scanUrl, accent]);

  async function downloadPng() {
    if (!qrRef.current) return;
    await qrRef.current.download({
      name: `repetoiq-${equipment.qr_slug}`,
      extension: 'png',
    });
  }

  async function downloadSvg() {
    if (!qrRef.current) return;
    await qrRef.current.download({
      name: `repetoiq-${equipment.qr_slug}`,
      extension: 'svg',
    });
  }

  return (
    <div>
      {/* ── Toolbar (not printed) ────────────────────────────── */}
      <div className="no-print mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          Sticker · {equipment.qr_slug}
        </div>
        <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
          Print QR sticker
        </h1>
        <p className="mt-2 break-all text-sm text-zinc-400">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600">
            Scan URL
          </span>{' '}
          {scanUrl}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadPng}
            className="rounded-none border border-white bg-white px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-black transition-colors hover:bg-black hover:text-white"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            className="rounded-none border border-white/30 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-white hover:text-white"
          >
            Download SVG
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-none border border-white/30 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-white hover:text-white"
          >
            Print
          </button>
          <a
            href="/owner/equipment"
            className="flex items-center rounded-none px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-white"
          >
            ← Back to equipment
          </a>
        </div>
      </div>

      {/* ── The sticker (printable) ──────────────────────────── */}
      <div className="sticker mx-auto flex max-w-md flex-col items-center rounded-2xl bg-white p-10 text-center text-black shadow-[0_20px_60px_-20px_rgb(0_0_0_/_0.6)]">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.32em]"
          style={{ color: accent }}
        >
          Scan to track
        </p>
        <h2 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight">
          {equipment.name}
        </h2>
        {equipment.machine_label && (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
            № {equipment.machine_label}
          </p>
        )}

        {showTagline && taglinePosition === 'top' && (
          <p className="mt-4 font-display text-sm italic text-neutral-600">
            {trimmedTagline}
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
            {trimmedTagline}
          </p>
        )}
        <div className="mt-5 flex items-center gap-2 opacity-70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/repetoIQicon.png" alt="repetoIQ" className="h-5 w-5" style={{ filter: 'invert(1)' }} />
          <span className="font-display text-xs lowercase tracking-tight text-neutral-700">repetoIQ</span>
        </div>
      </div>
    </div>
  );
}
