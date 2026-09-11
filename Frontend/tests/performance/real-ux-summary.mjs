import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const quantile = (values, p) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
};

export const distribution = values => {
  const observed = values.filter(Number.isFinite);
  const q1 = quantile(observed, 0.25);
  const q3 = quantile(observed, 0.75);
  return {
    observed: observed.length,
    missing: values.length - observed.length,
    median: quantile(observed, 0.5),
    p95: quantile(observed, 0.95),
    q1,
    q3,
    iqr: q1 == null || q3 == null ? null : q3 - q1,
    min: observed.length ? Math.min(...observed) : null,
    max: observed.length ? Math.max(...observed) : null,
  };
};

const sum = values => values.reduce((total, value) => total + value, 0);

const seededRandom = seed => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 2 ** 32;
  };
};

export function bootstrapMedianCi(values, { iterations = 2000, seed = 20260910 } = {}) {
  const observed = values.filter(Number.isFinite);
  if (!observed.length) return { n: 0, low: null, high: null, median: null, iterations: 0 };
  const random = seededRandom(seed);
  const estimates = [];
  for (let i = 0; i < iterations; i += 1) {
    const sample = [];
    for (let j = 0; j < observed.length; j += 1) {
      sample.push(observed[Math.floor(random() * observed.length)]);
    }
    estimates.push(quantile(sample, 0.5));
  }
  return {
    n: observed.length,
    low: quantile(estimates, 0.025),
    high: quantile(estimates, 0.975),
    median: quantile(observed, 0.5),
    iterations,
  };
}

function interval(probe, start, end) {
  if (!probe || start == null || end == null) return null;
  const entries = probe.entries ?? {};
  const loaf = entries['long-animation-frame']?.filter(entry => entry.startTime >= start && entry.startTime < end) ?? null;
  const longTasks = entries.longtask?.filter(entry => entry.startTime >= start && entry.startTime < end) ?? null;
  const rafGaps = probe.enabled
    ? probe.raf.slice(1).flatMap((timestamp, index) => {
        const previous = probe.raf[index];
        return previous >= start && timestamp < end ? [timestamp - previous] : [];
      })
    : null;
  return {
    start,
    end,
    duration: end - start,
    loafBlockingSum: loaf ? sum(loaf.map(entry => entry.blockingDuration ?? 0)) : null,
    loafCount: loaf?.length ?? null,
    loafLongest: loaf ? Math.max(0, ...loaf.map(entry => entry.duration ?? 0)) : null,
    longTaskSum: longTasks ? sum(longTasks.map(entry => entry.duration ?? 0)) : null,
    longTaskCount: longTasks?.length ?? null,
    rafP95: rafGaps?.length ? quantile(rafGaps, 0.95) : null,
    rafMax: rafGaps?.length ? Math.max(...rafGaps) : null,
    rafGap50Ratio: rafGaps?.length ? rafGaps.filter(gap => gap > 50).length / rafGaps.length : null,
    rafGap100Ratio: rafGaps?.length ? rafGaps.filter(gap => gap > 100).length / rafGaps.length : null,
    rafGap250Ratio: rafGaps?.length ? rafGaps.filter(gap => gap > 250).length / rafGaps.length : null,
  };
}

export function extractRunMetrics(run) {
  const base = {
    id: run.id,
    scenario: run.scenario,
    mode: run.mode,
    pair: run.pair,
    order: run.order,
    count: run.count,
    cpuSlowdown: run.cpuSlowdown,
    cacheCondition: run.cacheCondition,
    valid: Boolean(run.valid),
    invalidReason: run.valid ? null : run.failure ?? run.invalidReason ?? 'invalid-run',
  };
  if (!run.probe) return base;

  const probe = run.probe;
  const marks = probe.marks ?? {};
  const clicks = probe.entries?.event?.filter(entry => entry.name === 'click' && entry.interactionId > 0) ?? null;
  const click = clicks?.find(entry => Math.abs(entry.startTime - (probe.modal?.click?.eventTime ?? -10000)) < 5) ?? null;
  const interaction = click ? probe.entries.event.filter(entry => entry.interactionId === click.interactionId) : [];

  return {
    ...base,
    idle: interval(probe, marks.idleStart, marks.scrollStart),
    scroll: interval(probe, marks.scrollStart, marks.scrollEnd),
    recovery: interval(probe, marks.scrollEnd, marks.recoveryEnd),
    modalReadyMs: probe.modal?.readyAt != null ? probe.modal.readyAt - probe.modal.click.eventTime : null,
    modalTwoRafMs: probe.modal?.twoRafAt != null ? probe.modal.twoRafAt - probe.modal.click.eventTime : null,
    clickInputDelayMs: click ? click.processingStart - click.startTime : null,
    interactionDurationMs: interaction.length ? Math.max(...interaction.map(entry => entry.duration)) : null,
    eventTimingMissingReason: click ? null : !probe.enabled ? 'instrumentation-off' : !probe.supported?.includes('event') ? 'unsupported' : 'missing-or-threshold-censored',
    clickId: probe.modal?.click?.photoId ?? null,
    modalId: probe.modal?.modalId ?? null,
    actualClickDelayMs: run.pointer ? run.pointer.pressSentAt - run.inputs.at(-1).ackAt : null,
    inputMaxLatenessMs: run.path?.maxSendLatenessMs ?? null,
    externalScrollMs: run.externalEnd != null && run.externalStart != null ? run.externalEnd - run.externalStart : null,
    peak: run.path?.peak ?? null,
    finalTop: run.path?.end ?? null,
    boundaryCardCounts: [run.prepared?.cards, run.final?.cards],
  };
}

const groupingKey = metric => [
  metric.scenario,
  metric.mode,
  metric.count,
  metric.cpuSlowdown,
  metric.cacheCondition,
].join('|');

const groupLabel = key => {
  const [scenario, mode, count, cpuSlowdown, cacheCondition] = key.split('|');
  return { scenario, mode, count: Number(count), cpuSlowdown: Number(cpuSlowdown), cacheCondition };
};

export function summarizeRuns(runs, options = {}) {
  const metrics = runs.map(extractRunMetrics);
  const groups = new Map();
  for (const metric of metrics) {
    const key = groupingKey(metric);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(metric);
  }

  const getters = {
    loafBlockingSum: metric => metric.scroll?.loafBlockingSum,
    loafCount: metric => metric.scroll?.loafCount,
    loafLongest: metric => metric.scroll?.loafLongest,
    rafP95: metric => metric.scroll?.rafP95,
    rafMax: metric => metric.scroll?.rafMax,
    rafGap50Ratio: metric => metric.scroll?.rafGap50Ratio,
    rafGap100Ratio: metric => metric.scroll?.rafGap100Ratio,
    rafGap250Ratio: metric => metric.scroll?.rafGap250Ratio,
    longTaskSum: metric => metric.scroll?.longTaskSum,
    modalReadyMs: metric => metric.modalReadyMs,
    clickInputDelayMs: metric => metric.clickInputDelayMs,
    interactionDurationMs: metric => metric.interactionDurationMs,
    actualClickDelayMs: metric => metric.actualClickDelayMs,
    inputMaxLatenessMs: metric => metric.inputMaxLatenessMs,
    externalScrollMs: metric => metric.externalScrollMs,
  };

  const summaries = [...groups.entries()].map(([key, selected]) => {
    const valid = selected.filter(metric => metric.valid);
    return {
      ...groupLabel(key),
      attempts: selected.length,
      valid: valid.length,
      invalid: selected.length - valid.length,
      failures: selected.filter(metric => !metric.valid).map(metric => ({ id: metric.id, reason: metric.invalidReason })),
      metrics: Object.fromEntries(
        Object.entries(getters).map(([name, getter]) => [name, distribution(valid.map(getter))]),
      ),
    };
  });

  const paired = [];
  const pairKeys = new Set(metrics.map(metric => [
    metric.scenario,
    metric.count,
    metric.cpuSlowdown,
    metric.cacheCondition,
    metric.pair,
  ].join('|')));
  for (const key of pairKeys) {
    const [scenario, count, cpuSlowdown, cacheCondition, pair] = key.split('|');
    const selected = metrics.filter(metric =>
      metric.scenario === scenario &&
      metric.count === Number(count) &&
      metric.cpuSlowdown === Number(cpuSlowdown) &&
      metric.cacheCondition === cacheCondition &&
      metric.pair === Number(pair)
    );
    const all = selected.find(metric => metric.mode === 'all');
    const virtual = selected.find(metric => metric.mode === 'virtual');
    if (!all || !virtual) continue;
    const comparable = all.valid && virtual.valid && (scenario !== 'click' || all.clickId === virtual.clickId);
    paired.push({
      scenario,
      count: Number(count),
      cpuSlowdown: Number(cpuSlowdown),
      cacheCondition,
      pair: Number(pair),
      all: all.id,
      virtual: virtual.id,
      comparable,
      invalidReason: comparable ? null : all.invalidReason ?? virtual.invalidReason ?? 'not-comparable',
      deltaLoafBlocking: comparable && all.scroll?.loafBlockingSum != null && virtual.scroll?.loafBlockingSum != null ? all.scroll.loafBlockingSum - virtual.scroll.loafBlockingSum : null,
      deltaRafP95: comparable && all.scroll?.rafP95 != null && virtual.scroll?.rafP95 != null ? all.scroll.rafP95 - virtual.scroll.rafP95 : null,
      deltaModalReady: comparable && all.modalReadyMs != null && virtual.modalReadyMs != null ? all.modalReadyMs - virtual.modalReadyMs : null,
      deltaClickInputDelay: comparable && all.clickInputDelayMs != null && virtual.clickInputDelayMs != null ? all.clickInputDelayMs - virtual.clickInputDelayMs : null,
    });
  }

  const pairGroups = new Map();
  for (const pair of paired) {
    const key = [pair.scenario, pair.count, pair.cpuSlowdown, pair.cacheCondition].join('|');
    if (!pairGroups.has(key)) pairGroups.set(key, []);
    pairGroups.get(key).push(pair);
  }

  const pairedSummaries = [...pairGroups.entries()].map(([key, selected]) => {
    const [scenario, count, cpuSlowdown, cacheCondition] = key.split('|');
    const comparable = selected.filter(pair => pair.comparable);
    const metricCis = Object.fromEntries(
      ['deltaLoafBlocking', 'deltaRafP95', 'deltaModalReady', 'deltaClickInputDelay'].map(name => [
        name,
        {
          distribution: distribution(comparable.map(pair => pair[name])),
          bootstrapMedianCi: bootstrapMedianCi(comparable.map(pair => pair[name]), options.bootstrap),
        },
      ]),
    );
    return {
      scenario,
      count: Number(count),
      cpuSlowdown: Number(cpuSlowdown),
      cacheCondition,
      attempts: selected.length,
      comparable: comparable.length,
      invalidPairs: selected.length - comparable.length,
      failures: selected.filter(pair => !pair.comparable).map(pair => ({ pair: pair.pair, reason: pair.invalidReason })),
      metrics: metricCis,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    quantileMethod: 'linear interpolation using (n - 1) * p',
    deltaDirection: 'all - virtual; positive values favor virtualized rendering',
    metrics,
    summaries,
    paired,
    pairedSummaries,
  };
}

export function loadRawRuns(outputDir) {
  const rawDir = path.join(outputDir, 'raw');
  if (!existsSync(rawDir)) return [];
  return readdirSync(rawDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => JSON.parse(readFileSync(path.join(rawDir, file), 'utf8')));
}

export function writeSummary(outputDir, summary) {
  const summaryDir = path.join(outputDir, 'summaries');
  mkdirSync(summaryDir, { recursive: true });
  writeFileSync(path.join(summaryDir, 'summary.json'), JSON.stringify(summary, null, 2));
  const rows = ['scenario,count,cpuSlowdown,cacheCondition,mode,metric,attempts,valid,invalid,observed,missing,median,p95,q1,q3,iqr,min,max'];
  for (const group of summary.summaries) {
    for (const [metric, value] of Object.entries(group.metrics)) {
      rows.push([
        group.scenario,
        group.count,
        group.cpuSlowdown,
        group.cacheCondition,
        group.mode,
        metric,
        group.attempts,
        group.valid,
        group.invalid,
        value.observed,
        value.missing,
        value.median,
        value.p95,
        value.q1,
        value.q3,
        value.iqr,
        value.min,
        value.max,
      ].join(','));
    }
  }
  writeFileSync(path.join(summaryDir, 'summary.csv'), rows.join('\n'));
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const outputDir = path.resolve(process.argv[2] ?? '');
  const summary = summarizeRuns(loadRawRuns(outputDir));
  writeSummary(outputDir, summary);
  console.log(JSON.stringify({
    runs: summary.metrics.length,
    valid: summary.metrics.filter(metric => metric.valid).length,
    pairedSummaries: summary.pairedSummaries,
  }, null, 2));
}
