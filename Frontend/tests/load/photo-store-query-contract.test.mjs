import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const storeUrl = new URL('../../src/store/usePhotoStore.ts', import.meta.url);
const source = await readFile(storeUrl, 'utf8');
const moreStart = source.indexOf('fetchMorePhotos: async');
const moreEnd = source.indexOf('addCategory:', moreStart);
const fetchMoreSource = source.slice(moreStart, moreEnd);

test('photo query selects only UI fields', () => {
  assert.match(source, /export const PHOTO_SELECT/);
  assert.match(source, /media_id,/);
  assert.match(source, /location \(address_text, lat, lon\)/);
  assert.match(source, /media_description \(description_text\)/);
  assert.doesNotMatch(source, /location \(\*\)|category \(\*\)|media_description \(\*\)/);
});

test('additional pages reuse favorite IDs and initialize Supabase client', () => {
  assert.match(fetchMoreSource, /const supabase = await getSupabase\(\)/);
  assert.match(fetchMoreSource, /const favoriteIds = get\(\)\.favoriteIds/);
  assert.doesNotMatch(fetchMoreSource, /\.from\('favorites'\)/);
});

test('favorite cache resets with user state', () => {
  assert.match(source, /favoriteIds: new Set<string>\(\)/);
  assert.match(source, /favoriteIds,\s*photos: state\.photos\.map/);
});
