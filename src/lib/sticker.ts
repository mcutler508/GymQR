/**
 * Physical sticker spec + QR rendering helpers shared by the single-sticker
 * page and the bulk print page.
 *
 * Everything that ends up on paper is sized in real units (inches / points),
 * never pixels, so the browser can't rescale it. Layout: 3" × 3" stickers,
 * 6-up (2 × 3) on a US Letter sheet of printable sticker paper.
 */

export const SHEET = {
  widthIn: 8.5,
  heightIn: 11,
  cols: 2,
  rows: 3,
  stickerIn: 3,
  gapIn: 0.25,
} as const;

export const SLOTS_PER_SHEET = SHEET.cols * SHEET.rows;

/** CSS px per inch — fixed by the CSS spec, used to scale the on-screen preview. */
export const PX_PER_IN = 96;

export type StickerData = {
  id: string;
  qrSlug: string;
  name: string;
  machineLabel: string | null;
  scanUrl: string;
};

export type StickerBranding = {
  gymName: string;
  accent: string;
  tagline: string;
  taglinePosition: 'top' | 'bottom';
};

/**
 * Per-theme accent for the QR's corner finder eyes and the kicker text.
 * Passed through `printSafeAccent` before use, since several of these are
 * too light for a phone camera to lock onto once printed.
 */
const THEME_ACCENT: Record<string, string> = {
  halogen: '#F5D547',
  concrete: '#F97316',
  'locker-room': '#059669',
  athletic: '#65A30D',
};

export function accentForTheme(theme: string): string {
  return printSafeAccent(THEME_ACCENT[theme] ?? THEME_ACCENT.halogen);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

/**
 * Darken a color toward black until it has at least 4.5:1 contrast against
 * white paper. Keeps the hue (so the brand still reads) while guaranteeing
 * scanners can separate the finder patterns from the background.
 */
export function printSafeAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const toHex = () =>
    `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
  while (1.05 / (luminance(toHex()) + 0.05) < 4.5) {
    r *= 0.95;
    g *= 0.95;
    b *= 0.95;
  }
  return toHex();
}

/** Resolve a relative `/scan/...` URL against the current origin (client only). */
export function absoluteScanUrl(scanUrl: string): string {
  return scanUrl.startsWith('http') ? scanUrl : `${window.location.origin}${scanUrl}`;
}

const DUMBBELL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="3" y="36" width="11" height="28" rx="3" fill="#0a0a0a"/>
  <rect x="14" y="32" width="8" height="36" rx="2" fill="#0a0a0a"/>
  <rect x="22" y="44" width="56" height="12" rx="2" fill="#0a0a0a"/>
  <rect x="78" y="32" width="8" height="36" rx="2" fill="#0a0a0a"/>
  <rect x="86" y="36" width="11" height="28" rx="3" fill="#0a0a0a"/>
</svg>`.trim();

const LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DUMBBELL_SVG)}`;

/**
 * Build a qr-code-styling instance. Dot modules stay near-black for max scan
 * reliability; only the corner squares carry the (print-safe) accent.
 * `margin` is 0 — the quiet zone comes from the sticker's white padding.
 */
async function createQr(data: string, accent: string, type: 'svg' | 'canvas', size: number) {
  const { default: QRCodeStyling } = await import('qr-code-styling');
  return new QRCodeStyling({
    width: size,
    height: size,
    type,
    data,
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
}

/** Render the QR as a vector SVG blob — scales crisply to any print size. */
export async function renderQrSvg(data: string, accent: string): Promise<Blob> {
  const qr = await createQr(data, accent, 'svg', 1000);
  const raw = await qr.getRawData('svg');
  // Always a Blob in the browser (Buffer is only returned under Node).
  if (!(raw instanceof Blob)) throw new Error('QR render failed');
  return raw;
}

/** Download the QR alone. PNG is rendered at 1200px (≈ 600 DPI at 2"). */
export async function downloadQr(
  data: string,
  accent: string,
  name: string,
  extension: 'png' | 'svg',
) {
  const qr = await createQr(data, accent, extension === 'png' ? 'canvas' : 'svg', 1200);
  await qr.download({ name, extension });
}
