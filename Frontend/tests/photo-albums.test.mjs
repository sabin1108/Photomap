import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPhotoAlbums } from '../src/lib/photoAlbums.ts';

const photo = (id, overrides = {}) => ({
  id, title: id, url: `/${id}.jpg`, thumbnail_url: `/${id}-thumb.jpg`,
  date: '2026-01-01', location: 'Seoul', category: 'Travel', tags: [], isFavorite: false,
  ...overrides,
});

test('album grouping counts overlapping category and tags once and chooses newest cover', () => {
  const input = [
    photo('older', { tags: ['Travel', 'Travel', 'Night'], isFavorite: true }),
    photo('newer', { date: '2026-06-01', category: 'Night', tags: ['Travel'], isFavorite: true }),
    photo('elsewhere', { location: 'Tokyo', category: 'Other' }),
  ];
  const snapshot = structuredClone(input);
  const result = buildPhotoAlbums(input, ['Travel', 'Night', 'Empty']);
  assert.deepEqual(result.places.map(a => [a.title, a.count, a.cover]), [
    ['Seoul', 2, '/newer-thumb.jpg'], ['Tokyo', 1, '/elsewhere-thumb.jpg'],
  ]);
  assert.deepEqual(result.collections.map(a => [a.title, a.count, a.cover]), [
    ['Travel', 2, '/newer-thumb.jpg'], ['Night', 2, '/newer-thumb.jpg'], ['Empty', 0, ''],
  ]);
  assert.deepEqual(result.system.map(a => [a.id, a.count, a.cover]), [
    ['system_all', 3, '/older-thumb.jpg'], ['system_favorites', 2, '/older-thumb.jpg'],
  ]);
  assert.deepEqual(input, snapshot, 'derived albums must not reorder or mutate store photos');
});

test('empty albums remain discoverable and photos without location do not create place cards', () => {
  const empty = buildPhotoAlbums([], ['Empty']);
  assert.deepEqual(empty.system.map(a => a.count), [0, 0]);
  assert.equal(empty.collections[0].count, 0);
  assert.deepEqual(empty.places, []);
  const unknown = buildPhotoAlbums([photo('unknown', { location: '', date: 'Demo' })], ['Travel']);
  assert.deepEqual(unknown.places, []);
  assert.equal(unknown.collections[0].cover, '/unknown-thumb.jpg');
});
