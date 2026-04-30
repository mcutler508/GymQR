/**
 * Slug generation for new equipment QR codes.
 * Format: <normalized-name>-<machine-label?>-<short-random>
 *   - normalized: lowercase, alphanumeric + dashes only
 *   - random suffix keeps slugs unique across gyms (and within a gym across
 *     equipment that share names)
 */
export function generateQrSlug(name: string, machineLabel?: string | null): string {
  const parts = [normalize(name)];
  const label = machineLabel ? normalize(machineLabel) : '';
  if (label) parts.push(label);
  parts.push(randomSuffix(4));
  return parts.filter(Boolean).join('-');
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSuffix(len: number): string {
  // Avoid 0/O/1/l ambiguity by using a clear alphabet.
  const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += alpha[Math.floor(Math.random() * alpha.length)];
  }
  return out;
}
