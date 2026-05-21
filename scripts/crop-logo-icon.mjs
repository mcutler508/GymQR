import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, '..', 'public', 'repetoIQlogo.png');
const outputPath = join(__dirname, '..', 'public', 'repetoIQicon.png');

const image = sharp(inputPath);
const { width, height } = await image.metadata();
console.log('Source:', width, 'x', height);

// Source is 2816x1536. Crop to a square centered on the lifter+QR-frame
// motif: drop the wordmark (bottom ~40%) and trim the barbell ends
// (outer left/right) so the result is a nav-friendly square icon.
const cropHeight = Math.round(height * 0.62);
const cropWidth = cropHeight; // square
const cropLeft = Math.round((width - cropWidth) / 2);
await image
  .extract({ left: cropLeft, top: 0, width: cropWidth, height: cropHeight })
  .toFile(outputPath);

const meta = await sharp(outputPath).metadata();
console.log('Output:', meta.width, 'x', meta.height, '->', outputPath);
