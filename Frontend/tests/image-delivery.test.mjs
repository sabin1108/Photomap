import assert from 'node:assert/strict';
import test from 'node:test';

import { getGridImageLoadingPolicy, getPhotoImageUrl, getReliablePhotoImageUrl } from '../src/lib/imageUrl.ts';
import { buildImageVariantPaths } from '../src/lib/imageVariants.ts';

const originalUrl = 'https://project.supabase.co/storage/v1/object/public/photos/uploads/photo.jpg';

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
