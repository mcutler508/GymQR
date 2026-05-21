import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, '..', 'public', 'repetoIQlogo.png');

const image = sharp(inputPath);
const meta = await image.metadata();
console.log('Channels:', meta.channels, 'hasAlpha:', meta.hasAlpha, 'space:', meta.space);

const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
console.log('Raw info:', info.width, 'x', info.height, 'channels:', info.channels);

// Sample some corner + center pixels to see alpha values
function samplePixel(x, y) {
  const idx = (y * info.width + x) * info.channels;
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
}

console.log('Top-left (0,0):', samplePixel(0, 0));
console.log('Top-right (w-1,0):', samplePixel(info.width - 1, 0));
console.log('Bottom-left (0,h-1):', samplePixel(0, info.height - 1));
console.log('Bottom-right (w-1,h-1):', samplePixel(info.width - 1, info.height - 1));
console.log('Center (w/2, h/2):', samplePixel(Math.floor(info.width / 2), Math.floor(info.height / 2)));
console.log('Quarter (w/4, h/4):', samplePixel(Math.floor(info.width / 4), Math.floor(info.height / 4)));
