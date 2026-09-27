'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  PX_PER_IN,
  SHEET,
  SLOTS_PER_SHEET,
  absoluteScanUrl,
  renderQrSvg,
  type StickerBranding,
  type StickerData,
} from '@/lib/sticker';

/*
  Everything inside a sheet uses inline styles in physical units (in / pt)
  and explicit colors. Two reasons: the owner app's light-mode overrides
  retarget Tailwind color classes, and paper must not depend on screen px.
*/

const SHEET_W = SHEET.widthIn * PX_PER_IN;
const SHEET_H = SHEET.heightIn * PX_PER_IN;
const GRID_W = SHEET.cols * SHEET.stickerIn + (SHEET.cols - 1) * SHEET.gapIn;
const GRID_H = SHEET.rows * SHEET.stickerIn + (SHEET.rows - 1) * SHEET.gapIn;

const MONO = 'var(--font-mono), ui-monospace, monospace';
const DISPLAY = 'var(--font-display), ui-serif, Georgia, serif';

type Props = {
  stickers: StickerData[];
  branding: StickerBranding;
  /** Toolbar heading block (kicker, title, description). */
  header: ReactNode;
  /** Extra toolbar buttons rendered after Print. */
  actions?: ReactNode;
};

/**
 * Print studio: in-app, to-scale preview of the Letter sticker sheet(s), plus
 * the actual print output. The preview and the printed page render the same
 * <Sheet> component, so what you see is what the printer gets.
 */
export function StickerSheet({ stickers, branding, header, actions }: Props) {
  const qrUrls = useQrImages(stickers, branding.accent);
  const [startSlot, setStartSlot] = useState(0);
  const [cutGuides, setCutGuides] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const ready = stickers.every((s) => qrUrls[s.id]);
  const sheets = paginate(stickers, startSlot);

  const sheetEls = (preview: boolean) =>
    sheets.map((slots, i) => (
      <Sheet
        key={i}
        slots={slots}
        branding={branding}
        qrUrls={qrUrls}
        cutGuides={cutGuides}
        onPickSlot={preview && i === 0 ? setStartSlot : undefined}
        startSlot={i === 0 ? startSlot : 0}
      />
    ));

  return (
    <div>
      <div className="no-print mb-8">
        {header}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            className="rounded-none border border-white bg-white px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
          >
            {ready ? `Print ${sheets.length === 1 ? 'sheet' : `${sheets.length} sheets`}` : 'Preparing…'}
          </button>
          {actions}
        </div>

        <div className="mt-6 grid gap-4 border border-white/10 p-4 text-sm text-zinc-400 md:grid-cols-[1fr_auto]">
          <div>
            <p>
              <span className="text-white">3&Prime; × 3&Prime; stickers, 6 per US Letter sheet.</span>{' '}
              Using a partly used sheet? Click the first open spot in the preview to start there.
            </p>
            <p className="mt-2">
              In the print dialog set <span className="text-white">Scale: 100% / Actual size</span>{' '}
              (not &ldquo;Fit to page&rdquo;), paper <span className="text-white">Letter</span>, margins{' '}
              <span className="text-white">None</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
              Start at spot
              <select
                value={startSlot}
                onChange={(e) => setStartSlot(Number(e.target.value))}
                className="border border-white/20 bg-black px-2 py-1 text-white"
              >
                {Array.from({ length: SLOTS_PER_SHEET }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
              <input
                type="checkbox"
                checked={cutGuides}
                onChange={(e) => setCutGuides(e.target.checked)}
              />
              Cut guides
            </label>
          </div>
        </div>
      </div>

      {/* ── Preview (screen only) ─────────────────────────────── */}
      <div className="no-print space-y-8">
        {sheetEls(true).map((sheet, i) => (
          <div key={i}>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
              Print preview · Sheet {i + 1} of {sheets.length}
            </div>
            <ScaledPage>{sheet}</ScaledPage>
          </div>
        ))}
      </div>

      {/* ── Print output: a direct child of <body> so the print stylesheet
            can hide the whole app shell with display:none. ─────────── */}
      {mounted &&
        createPortal(<div className="print-root">{sheetEls(false)}</div>, document.body)}
    </div>
  );
}

/** Render every sticker's QR once as a vector SVG object URL. */
function useQrImages(stickers: StickerData[], accent: string) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = stickers.map((s) => `${s.id}:${s.scanUrl}`).join('|');

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    setUrls({});

    (async () => {
      for (const s of stickers) {
        const blob = await renderQrSvg(absoluteScanUrl(s.scanUrl), accent);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        created.push(url);
        setUrls((prev) => ({ ...prev, [s.id]: url }));
      }
    })();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures stickers
  }, [key, accent]);

  return urls;
}

function paginate(stickers: StickerData[], startSlot: number): (StickerData | null)[][] {
  const slots: (StickerData | null)[] = [
    ...Array<null>(startSlot).fill(null),
    ...stickers,
  ];
  const sheets: (StickerData | null)[][] = [];
  for (let i = 0; i < slots.length; i += SLOTS_PER_SHEET) {
    const page = slots.slice(i, i + SLOTS_PER_SHEET);
    while (page.length < SLOTS_PER_SHEET) page.push(null);
    sheets.push(page);
  }
  return sheets;
}

/** Scale a true-size Letter page down to fit the available width. */
function ScaledPage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / SHEET_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      <div
        style={{
          width: SHEET_W * scale,
          height: SHEET_H * scale,
          margin: '0 auto',
          boxShadow: '0 20px 60px -20px rgb(0 0 0 / 0.6)',
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Sheet({
  slots,
  branding,
  qrUrls,
  cutGuides,
  startSlot,
  onPickSlot,
}: {
  slots: (StickerData | null)[];
  branding: StickerBranding;
  qrUrls: Record<string, string>;
  cutGuides: boolean;
  startSlot: number;
  onPickSlot?: (slot: number) => void;
}) {
  return (
    <div
      className="print-sheet"
      style={{
        position: 'relative',
        width: `${SHEET.widthIn}in`,
        height: `${SHEET.heightIn}in`,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${(SHEET.widthIn - GRID_W) / 2}in`,
          top: `${(SHEET.heightIn - GRID_H) / 2}in`,
          display: 'grid',
          gridTemplateColumns: `repeat(${SHEET.cols}, ${SHEET.stickerIn}in)`,
          gridAutoRows: `${SHEET.stickerIn}in`,
          gap: `${SHEET.gapIn}in`,
        }}
      >
        {slots.map((s, i) => {
          const slotStyle = {
            position: 'relative' as const,
            outline: cutGuides ? '0.5pt dashed #b5b5b5' : undefined,
          };
          if (s) {
            return (
              <div key={i} style={slotStyle}>
                <Sticker sticker={s} branding={branding} qrUrl={qrUrls[s.id]} />
              </div>
            );
          }
          // Empty slot: blank on paper; on screen, clickable to set start spot.
          const skipped = onPickSlot && i < startSlot;
          return (
            <button
              key={i}
              type="button"
              disabled={!onPickSlot}
              onClick={() => onPickSlot?.(i)}
              title={onPickSlot ? `Start printing at spot ${i + 1}` : undefined}
              style={{
                ...slotStyle,
                background: skipped
                  ? 'repeating-linear-gradient(45deg, #f1f1f1 0 6px, #fff 6px 12px)'
                  : '#fff',
                border: 0,
                cursor: onPickSlot ? 'pointer' : 'default',
                font: `8pt ${MONO}`,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#a3a3a3',
              }}
            >
              {onPickSlot ? (skipped ? 'Already used' : `Spot ${i + 1}`) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const GYM_NAME_TRACKING = 0.14;

/**
 * Largest font size (pt, capped at 7) that keeps the full gym name on one
 * row. Monospace glyphs are ~0.6em wide, plus letter-spacing. Available width
 * is the sticker's inner width (3" − 2 × 0.16" padding = 193pt) minus the
 * two divider stubs and gaps (~22pt).
 */
function gymNameSize(name: string): number {
  const available = 193 - 22;
  const perChar = 0.6 + GYM_NAME_TRACKING;
  return Math.min(7, available / (Math.max(name.length, 1) * perChar));
}

/** One 3" × 3" sticker. */
function Sticker({
  sticker,
  branding,
  qrUrl,
}: {
  sticker: StickerData;
  branding: StickerBranding;
  qrUrl: string | undefined;
}) {
  const { gymName, tagline, taglinePosition } = branding;
  const trimmedTagline = tagline.trim();
  const taglineEl = trimmedTagline ? (
    <p
      style={{
        margin: 0,
        font: `italic 7pt ${DISPLAY}`,
        color: '#525252',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {trimmedTagline}
    </p>
  ) : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '0.16in',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'center',
        background: '#fff',
        color: '#0a0a0a',
      }}
    >
      <h2
        style={{
          margin: 0,
          font: `400 ${sticker.name.length > 22 ? 10.5 : 13}pt/1.15 ${DISPLAY}`,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {sticker.name}
      </h2>
      {taglinePosition === 'top' && taglineEl}

      {/* QR fills whatever height is left; white padding is the quiet zone. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '0.1in 0',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="" style={{ height: '100%', aspectRatio: '1', display: 'block' }} />
        ) : (
          <div style={{ height: '100%', aspectRatio: '1', background: '#f5f5f5' }} />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5pt',
          font: `${gymNameSize(gymName)}pt ${MONO}`,
          letterSpacing: `${GYM_NAME_TRACKING}em`,
          textTransform: 'uppercase',
          color: '#737373',
        }}
      >
        <span style={{ flex: 1, minWidth: '6pt', height: '0.5pt', background: '#d4d4d4' }} />
        <span style={{ whiteSpace: 'nowrap' }}>{gymName}</span>
        <span style={{ flex: 1, minWidth: '6pt', height: '0.5pt', background: '#d4d4d4' }} />
      </div>
      {taglinePosition === 'bottom' && taglineEl && <div style={{ marginTop: '2pt' }}>{taglineEl}</div>}
    </div>
  );
}
