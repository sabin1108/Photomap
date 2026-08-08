import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith('--')) continue;
  const key = value.slice(2);
  const next = process.argv[index + 1];
  if (!next || next.startsWith('--')) args.set(key, 'true');
  else {
    args.set(key, next);
    index += 1;
  }
}

const baseUrl = new URL(args.get('base-url') || 'http://127.0.0.1:4173/');
const concurrency = Number(args.get('concurrency') || 10);
const durationSeconds = Number(args.get('duration-seconds') || 15);
const output = args.get('output');

if (!['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname) && args.get('allow-remote') !== 'true') {
  throw new Error('Remote load is blocked. Use localhost or explicitly pass --allow-remote.');
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 500) {
  throw new Error('--concurrency must be an integer from 1 to 500.');
}
if (!Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > 3600) {
  throw new Error('--duration-seconds must be from 1 to 3600.');
}

const indexResponse = await fetch(baseUrl);
if (!indexResponse.ok) throw new Error(`Initial HTML returned ${indexResponse.status}.`);
const indexHtml = await indexResponse.text();
const assetPaths = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((asset) => asset.startsWith('/') && !asset.startsWith('//'));
const requestUrls = [...new Set(['/', ...assetPaths, '/unity-map/index.html'])]
  .map((requestPath) => new URL(requestPath, baseUrl).href);

const durations = [];
const statuses = new Map();
let bytes = 0;
let failures = 0;
let iterations = 0;
let requests = 0;
const startedAt = new Date();
const start = performance.now();
const deadline = start + durationSeconds * 1000;

async function fetchAsset(url) {
  const requestStart = performance.now();
  try {
    const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
    const body = await response.arrayBuffer();
    durations.push(performance.now() - requestStart);
    statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
    bytes += body.byteLength;
    requests += 1;
    if (!response.ok) failures += 1;
  } catch {
    durations.push(performance.now() - requestStart);
    failures += 1;
    requests += 1;
  }
}

async function worker() {
  while (performance.now() < deadline) {
    await Promise.all(requestUrls.map(fetchAsset));
    iterations += 1;
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
const elapsedSeconds = (performance.now() - start) / 1000;
durations.sort((left, right) => left - right);
const percentile = (ratio) => durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))] || 0;
const result = {
  target: baseUrl.href,
  startedAt: startedAt.toISOString(),
  environment: 'local Vite production preview; Node fetch; closed concurrency model',
  concurrency,
  configuredDurationSeconds: durationSeconds,
  elapsedSeconds: Number(elapsedSeconds.toFixed(3)),
  urlsPerIteration: requestUrls.length,
  requestPaths: requestUrls.map((url) => new URL(url).pathname),
  iterations,
  requests,
  requestsPerSecond: Number((requests / elapsedSeconds).toFixed(2)),
  iterationsPerSecond: Number((iterations / elapsedSeconds).toFixed(2)),
  failureRate: requests ? Number((failures / requests).toFixed(6)) : 0,
  failures,
  statuses: Object.fromEntries(statuses),
  bytesReceived: bytes,
  latencyMs: {
    average: Number((durations.reduce((sum, value) => sum + value, 0) / Math.max(durations.length, 1)).toFixed(2)),
    p50: Number(percentile(0.5).toFixed(2)),
    p95: Number(percentile(0.95).toFixed(2)),
    p99: Number(percentile(0.99).toFixed(2)),
    max: Number((durations.at(-1) || 0).toFixed(2)),
  },
};

if (output) {
  const outputPath = path.resolve(output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(result, null, 2));
