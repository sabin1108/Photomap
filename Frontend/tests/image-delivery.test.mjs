import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { getGridImageLoadingPolicy, getPhotoImageUrl, getReliablePhotoImageUrl } from '../src/lib/imageUrl.ts';
import { buildImageVariantPaths } from '../src/lib/imageVariants.ts';
import { isPerformancePreviewLocation } from '../src/lib/performancePreview.ts';
import { publicDemoImageManifest, resolvePublicDemoImageUrls } from '../src/lib/publicDemoImages.ts';

const originalUrl = 'https://project.supabase.co/storage/v1/object/public/photos/uploads/photo.jpg';

test('performance fixture mode never replaces production data', () => {
  assert.equal(
    isPerformancePreviewLocation('photomap-three.vercel.app', '?perfImageMode=optimized'),
    false,
  );
  assert.equal(
    isPerformancePreviewLocation('photomap-preview.vercel.app', '?perfImageMode=optimized'),
    true,
  );
  assert.equal(
    isPerformancePreviewLocation('photomap-preview.vercel.app', ''),
    false,
  );
});

test('thumbnail fallback never depends on the paid Supabase image transform endpoint', () => {
  const photo = { url: originalUrl, thumbnail_url: null };

  assert.equal(getPhotoImageUrl(photo, 'thumb'), originalUrl);
  assert.equal(getPhotoImageUrl(photo, 'full'), originalUrl);
});

test('stored thumbnail derivative is preferred for grid delivery', () => {
  const thumbnailUrl = 'https://project.supabase.co/storage/v1/object/public/photos/uploads/photo-thumb.webp';
  const photo = { url: originalUrl, thumbnail_url: thumbnailUrl };

  assert.equal(getPhotoImageUrl(photo, 'thumb'), thumbnailUrl);
});

test('only the LCP candidate receives high fetch priority', () => {
  assert.deepEqual(getGridImageLoadingPolicy(0, 3), { loading: 'eager', fetchPriority: 'high' });
  assert.deepEqual(getGridImageLoadingPolicy(1, 3), { loading: 'eager', fetchPriority: 'auto' });
  assert.deepEqual(getGridImageLoadingPolicy(3, 3), { loading: 'lazy', fetchPriority: 'auto' });
});

test('physical derivatives use unique immutable paths', () => {
  assert.deepEqual(buildImageVariantPaths('여행 photo.JPG', 'abc-123'), {
    original: 'uploads/abc-123-photo/original.jpg',
    display: 'uploads/abc-123-photo/display.webp',
    thumbnail: 'uploads/abc-123-photo/thumb.webp',
  });
});

test('legacy transform URLs recover their public object URL', () => {
  const legacy = 'https://project.supabase.co/storage/v1/render/image/public/photos/demo/a.jpg?width=320&quality=70';
  assert.equal(
    getReliablePhotoImageUrl({ url: legacy, thumbnail_url: legacy }, 'thumb'),
    'https://project.supabase.co/storage/v1/object/public/photos/demo/a.jpg',
  );
});

test('production demo originals resolve to bundled WebP derivatives', () => {
  const urls = resolvePublicDemoImageUrls(
    'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/object/public/photo-uploads/demo/' +
      '3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504003794-1-alexander1848-night-sky-9059825_1920.jpg',
  );

  assert.deepEqual(urls, {
    display: '/demo-images/v1/1-display.webp',
    thumbnail: '/demo-images/v1/1-thumb.webp',
  });
  assert.equal(resolvePublicDemoImageUrls(originalUrl), null);
});

test('all production demo derivatives are physical WebP files', () => {
  assert.equal(publicDemoImageManifest.length, 16);
  const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));

  for (const image of publicDemoImageManifest) {
    for (const variant of ['display', 'thumb']) {
      const imagePath = path.join(publicRoot, 'demo-images', 'v1', `${image.id}-${variant}.webp`);
      const header = readFileSync(imagePath).subarray(0, 12);
      assert.equal(header.subarray(0, 4).toString(), 'RIFF');
      assert.equal(header.subarray(8, 12).toString(), 'WEBP');
      assert.ok(statSync(imagePath).size > 0, `${imagePath} must not be empty`);
    }
  }
});
