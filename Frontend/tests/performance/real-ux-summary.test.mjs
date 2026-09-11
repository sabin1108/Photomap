import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapMedianCi, distribution, extractRunMetrics, summarizeRuns } from './real-ux-summary.mjs';

function run({ id, mode, pair, valid = true, loaf = 0, raf = [0, 10, 30, 70], modalReady = 100, clickId = 'fixture-0007', scenario = 'click' }) {
  return {
    id,
    scenario,
    mode,
    pair,
    count: 1000,
    cpuSlowdown: 1,
    cacheCondition: 'warm',
    valid,
    failure: valid ? undefined : 'Functional failure',
    inputs: [{ ackAt: 3000 }],
    pointer: { pressSentAt: 3050 },
    path: { maxSendLatenessMs: 2, peak: scenario === 'click' ? 1800 : 6000, end: scenario === 'scroll' ? 0 : 1800 },
    externalStart: 0,
    externalEnd: scenario === 'scroll' ? 20000 : 3000,
    prepared: { cards: mode === 'all' ? 1000 : 18 },
    final: { cards: mode === 'all' ? 1000 : 18 },
    probe: {
      enabled: true,
      supported: ['event', 'long-animation-frame', 'longtask'],
      marks: { idleStart: 0, scrollStart: 10, scrollEnd: 80, recoveryEnd: 120 },
      raf,
      entries: {
        'long-animation-frame': [{ startTime: 20, duration: 40, blockingDuration: loaf }],
        longtask: [{ startTime: 30, duration: 55 }],
        event: [{ name: 'click', startTime: 3090, processingStart: 3102, duration: 24, interactionId: 4 }],
      },
      modal: {
        click: { eventTime: 3090, receivedAt: 3094, photoId: clickId },
        modalId: clickId,
        readyAt: 3090 + modalReady,
        twoRafAt: 3090 + modalReady + 34,
      },
      initialVisibility: 'visible',
      finalVisibility: 'visible',
      visibility: [],
    },
  };
}

test('distribution reports median, IQR, p95, and missing values distinctly', () => {
  assert.deepEqual(distribution([1, 2, 3, null, Number.NaN, 9]), {
    observed: 4,
    missing: 2,
    median: 2.5,
    p95: 8.099999999999998,
    q1: 1.75,
    q3: 4.5,
    iqr: 2.75,
    min: 1,
    max: 9,
  });
});

test('extractRunMetrics uses browser observer windows and code-only modal ready time', () => {
  const metric = extractRunMetrics(run({ id: 'all-1', mode: 'all', pair: 1, loaf: 17, modalReady: 64 }));
  assert.equal(metric.scroll.loafBlockingSum, 17);
  assert.equal(metric.scroll.rafP95, 39);
  assert.equal(metric.modalReadyMs, 64);
  assert.equal(metric.actualClickDelayMs, 50);
  assert.equal(metric.boundaryCardCounts[0], 1000);
});

test('summarizeRuns preserves invalid denominators and paired bootstrap deltas', () => {
  const summary = summarizeRuns([
    run({ id: 'p1-all', mode: 'all', pair: 1, loaf: 30, modalReady: 120 }),
    run({ id: 'p1-virtual', mode: 'virtual', pair: 1, loaf: 10, modalReady: 70 }),
    run({ id: 'p2-all', mode: 'all', pair: 2, loaf: 40, modalReady: 160 }),
    run({ id: 'p2-virtual', mode: 'virtual', pair: 2, loaf: 25, modalReady: 100 }),
    run({ id: 'p3-all-invalid', mode: 'all', pair: 3, valid: false }),
    run({ id: 'p3-virtual', mode: 'virtual', pair: 3 }),
  ], { bootstrap: { iterations: 200, seed: 1 } });

  const allGroup = summary.summaries.find(group => group.mode === 'all');
  assert.equal(allGroup.attempts, 3);
  assert.equal(allGroup.valid, 2);
  assert.equal(allGroup.invalid, 1);
  assert.equal(allGroup.failures[0].id, 'p3-all-invalid');

  const paired = summary.pairedSummaries[0];
  assert.equal(paired.attempts, 3);
  assert.equal(paired.comparable, 2);
  assert.equal(paired.invalidPairs, 1);
  assert.equal(paired.metrics.deltaLoafBlocking.distribution.median, 17.5);
  assert.equal(paired.metrics.deltaModalReady.distribution.median, 55);
  assert.equal(paired.metrics.deltaModalReady.bootstrapMedianCi.n, 2);
  assert.ok(Number.isFinite(paired.metrics.deltaModalReady.bootstrapMedianCi.low));
});

test('bootstrapMedianCi is deterministic for report regeneration', () => {
  assert.deepEqual(
    bootstrapMedianCi([10, 20, 30], { iterations: 50, seed: 77 }),
    bootstrapMedianCi([10, 20, 30], { iterations: 50, seed: 77 }),
  );
});
