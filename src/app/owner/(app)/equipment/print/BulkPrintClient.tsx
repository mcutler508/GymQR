'use client';

import Link from 'next/link';
import { accentForTheme, type StickerData } from '@/lib/sticker';
import { StickerSheet } from '../_sticker/StickerSheet';

type Props = {
  stickers: StickerData[];
  gymName: string;
  gymTheme: string;
  tagline: string;
  taglinePosition: 'top' | 'bottom';
};

export function BulkPrintClient({
  stickers,
  gymName,
  gymTheme,
  tagline,
  taglinePosition,
}: Props) {
  return (
    <StickerSheet
      stickers={stickers}
      branding={{ gymName, accent: accentForTheme(gymTheme), tagline, taglinePosition }}
      header={
        <>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
            Bulk print · {stickers.length} {stickers.length === 1 ? 'sticker' : 'stickers'}
          </div>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Print selected stickers
          </h1>
        </>
      }
      actions={
        <Link
          href="/owner/equipment"
          className="flex items-center rounded-none px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-white"
        >
          ← Back to equipment
        </Link>
      }
    />
  );
}
