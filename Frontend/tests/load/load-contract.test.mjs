import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./supabase-read.js', import.meta.url), 'utf8');

test('production and secret credentials are blocked', () => {
  assert.match(source, /LOAD_TEST_CONFIRM/);
  assert.match(source, /wmxdaprqassvwboiownd/);
  assert.match(source, /sb_secret_/);
  assert.doesNotMatch(source, /service_role\s*[:=]\s*['"]/);
});

test('initial photo flow exercises three read endpoints', () => {
  assert.match(source, /\/rest\/v1\/category\?/);
  assert.match(source, /\/rest\/v1\/media\?/);
  assert.match(source, /\/rest\/v1\/favorites\?/);
  assert.match(source, /http\.batch\(requests\)/);
});

test('capacity profiles and thresholds stay explicit', () => {
  for (const name of ['smoke', 'normal', 'peak', 'spike', 'soak']) {
    assert.match(source, new RegExp(`${name}: \\{`));
  }
  assert.match(source, /p\(95\)<300/);
  assert.match(source, /p\(99\)<800/);
  assert.match(source, /dropped_iterations/);
  assert.match(source, /load_rate_limited/);
});
