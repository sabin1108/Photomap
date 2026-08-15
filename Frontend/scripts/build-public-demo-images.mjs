import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  getPublicDemoSourceUrl,
  publicDemoImageManifest,
} from '../src/lib/publicDemoImages.ts';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = path.join(frontendRoot, 'public', 'demo-images', 'v1');
await mkdir(outputDirectory, { recursive: true });

for (const image of publicDemoImageManifest) {
  const response = await fetch(getPublicDemoSourceUrl(image.fileName));
  if (!response.ok) {
    throw new Error(`${image.fileName}: source download failed with HTTP ${response.status}`);
  }

  const source = Buffer.from(await response.arrayBuffer());
  if (source.length > 20 * 1024 * 1024) {
    throw new Error(`${image.fileName}: source exceeds 20 MiB safety limit`);
  }

  await Promise.all([
    sharp(source)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(outputDirectory, `${image.id}-display.webp`)),
    sharp(source)
      .rotate()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(path.join(outputDirectory, `${image.id}-thumb.webp`)),
  ]);

  console.log(`generated demo image ${image.id}/16`);
}
