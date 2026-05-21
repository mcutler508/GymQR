import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// The supplied logo is white-on-grey-checkerboard with the checkerboard
// painted as solid pixels (alpha=255 everywhere). Rebuild real transparency
// by mapping luminance → alpha: white icon pixels stay opaque, grey pixels
// become transparent, edge anti-aliasing interpolates smoothly.
async function makeTransparent(inputName, outputName) {
  const inputPath = join(root, 'public', inputName);
  const outputPath = join(root, 'public', outputName);

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(data.length);

  // Lower / upper luminance bounds for the alpha ramp. Pixels below LOW
  // become fully transparent; pixels above HIGH stay fully opaque; in
  // between interpolate linearly to preserve smooth edges.
  const LOW = 110;
  const HIGH = 230;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Perceptual luminance.
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let alpha;
    if (lum <= LOW) alpha = 0;
    else if (lum >= HIGH) alpha = 255;
    else alpha = Math.round(((lum - LOW) / (HIGH - LOW)) * 255);

    out[i] = 255;     // force opaque white where visible
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = alpha;
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);

  console.log(`Wrote ${outputPath}`);
}

await makeTransparent('repetoIQlogo.png', 'repetoIQlogo.png');
await makeTransparent('repetoIQicon.png', 'repetoIQicon.png');
