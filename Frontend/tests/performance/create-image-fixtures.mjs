import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../public/performance-fixtures');
const sourcePath = path.join(root, 'travel-source.png');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const source = `data:image/png;base64,${readFileSync(sourcePath).toString('base64')}`;
  const outputs = await page.evaluate(async dataUrl => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();

    const encode = (maxDimension, type, quality) => {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL(type, quality).split(',')[1];
    };

    return {
      baseline: encode(1600, 'image/jpeg', 0.92),
      display: encode(1600, 'image/webp', 0.8),
      thumbnail: encode(480, 'image/webp', 0.72),
    };
  }, source);

  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, 'travel-baseline.jpg'), Buffer.from(outputs.baseline, 'base64'));
  writeFileSync(path.join(root, 'travel-display.webp'), Buffer.from(outputs.display, 'base64'));
  writeFileSync(path.join(root, 'travel-thumb.webp'), Buffer.from(outputs.thumbnail, 'base64'));
} finally {
  await browser.close();
}
