import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertStagingDependencies,
  validateRunPolicy,
} from './virtual-traffic-policy.mjs';

const production = 'https://photomap-three.vercel.app/';
const staging = 'https://photomap-staging-example.vercel.app/';

test('production pilot requires exact confirmation and low traffic caps', () => {
  assert.throws(() => validateRunPolicy({
    target: production,
    confirmation: 'staging-only',
    sessions: 20,
    concurrency: 1,
  }), /production-pilot/);

  assert.throws(() => validateRunPolicy({
    target: production,
    confirmation: 'production-pilot',
    sessions: 21,
    concurrency: 1,
  }), /capped/);

  const policy = validateRunPolicy({
    target: production,
    confirmation: 'production-pilot',
    sessions: 20,
    concurrency: 1,
  });
  assert.equal(policy.mode, 'production-pilot');
  assert.equal(policy.allowMap, false);
});

test('staging requires declared Vercel hostname', () => {
  assert.throws(() => validateRunPolicy({
    target: staging,
    confirmation: 'staging-only',
    sessions: 100,
    concurrency: 5,
    declaredStagingHost: 'wrong.vercel.app',
  }), /exactly match/);

  const policy = validateRunPolicy({
    target: staging,
    confirmation: 'staging-only',
    sessions: 100,
    concurrency: 5,
    declaredStagingHost: 'photomap-staging-example.vercel.app',
  });
  assert.equal(policy.mode, 'staging');
  assert.equal(policy.allowMap, true);
});

test('staging preflight rejects production Supabase dependency', () => {
  assert.throws(() => assertStagingDependencies({
    mode: 'staging',
    observedUrls: ['https://wmxdaprqassvwboiownd.supabase.co/rest/v1/media'],
  }), /production Supabase/);
});
