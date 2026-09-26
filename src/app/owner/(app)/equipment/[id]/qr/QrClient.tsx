'use client';

import type { Equipment } from '@/lib/supabase';
import { absoluteScanUrl, accentForTheme, downloadQr } from '@/lib/sticker';
import { StickerSheet } from '../../_sticker/StickerSheet';

type Props = {
  equipment: Equipment;
  initialScanUrl: string;
  gymName: string;
  gymTheme: string;
  tagline: string;
  taglinePosition: 'top' | 'bottom';
};

export function QrClient({
  equipment,
  initialScanUrl,
  gymName,
  gymTheme,
  tagline,
  taglinePosition,
}: Props) {
  const accent = accentForTheme(gymTheme);
  const fileName = `repetoiq-${equipment.qr_slug}`;

  return (
    <StickerSheet
      stickers={[
        {
          id: equipment.id,
          qrSlug: equipment.qr_slug,
          name: equipment.name,
          machineLabel: equipment.machine_label,
          scanUrl: initialScanUrl,
        },
      ]}
      branding={{ gymName, accent, tagline, taglinePosition }}
      header={
        <>
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
            {initialScanUrl}
          </p>
        </>
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => downloadQr(absoluteScanUrl(initialScanUrl), accent, fileName, 'png')}
            className="rounded-none border border-white/30 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-white hover:text-white"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => downloadQr(absoluteScanUrl(initialScanUrl), accent, fileName, 'svg')}
            className="rounded-none border border-white/30 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-white hover:text-white"
          >
            Download SVG
          </button>
          <a
            href="/owner/equipment"
            className="flex items-center rounded-none px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-white"
          >
            ← Back to equipment
          </a>
        </>
      }
    />
  );
}
