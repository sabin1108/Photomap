import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./local-static-load.mjs', import.meta.url), 'utf8');

test('remote targets require explicit opt-in', () => {
  assert.match(source, /Remote load is blocked/);
  assert.match(source, /allow-remote/);
  assert.match(source, /127\.0\.0\.1/);
});

test('local load result keeps capacity and latency evidence', () => {
  for (const metric of ['requestsPerSecond', 'failureRate', 'p50', 'p95', 'p99', 'bytesReceived']) {
    assert.match(source, new RegExp(metric));
  }
});

test('concurrency and duration have hard safety bounds', () => {
  assert.match(source, /concurrency > 500/);
  assert.match(source, /durationSeconds > 3600/);
});
