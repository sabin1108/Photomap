import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

 test('fixture collector forwards imageinfo continuation before finishing category', () => {
  const mock = `
    let call = 0;
    globalThis.fetch = async input => {
      const url = new URL(input);
      call++;
      if (call === 2 && url.searchParams.get('iicontinue') !== 'next-image') throw Error('Imageinfo continuation lost');
      const page = { pageid: call, title: 'File:Photo' + call + '.jpg', imageinfo: [{ mime: 'image/jpeg', thumburl: 'https://example.test/thumb.jpg', url: 'https://example.test/photo.jpg', descriptionurl: 'https://example.test/source', width: 2000, height: 1600, extmetadata: { License: { value: 'cc-by-4.0' }, LicenseShortName: { value: 'CC BY 4.0' } } }] };
      return { ok: true, json: async () => ({ query: { pages: [page] }, ...(call === 1 ? { continue: { iicontinue: 'next-image', continue: '||' } } : {}) }) };
    };
  `;
  const result = spawnSync(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(mock), 'scripts/build-real-ux-fixtures.mjs', '--count', '2', '--dry-run'], { cwd: new URL('../..', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const resultData = JSON.parse(result.stdout);
  assert.equal(resultData.eligible_candidates, 2);
});

test('unsupported cold mode fails before creating an experiment', () => {
  const result = spawnSync(process.execPath, ['tests/performance/real-ux-performance.mjs', '--cache', 'cold'], { cwd: new URL('../..', import.meta.url), encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Only warm is supported/);
});
