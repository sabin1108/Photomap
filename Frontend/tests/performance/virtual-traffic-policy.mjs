export const PRODUCTION_HOSTS = new Set([
  'photomap-three.vercel.app',
]);

export const PRODUCTION_SUPABASE_REF = 'wmxdaprqassvwboiownd';

export function classifyTarget(rawTarget) {
  const target = new URL(rawTarget);
  if (target.protocol !== 'https:') {
    throw new Error('Virtual traffic target must use HTTPS.');
  }

  return {
    target: target.toString(),
    hostname: target.hostname,
    isProduction: PRODUCTION_HOSTS.has(target.hostname),
  };
}

export function validateRunPolicy({
  target,
  confirmation,
  sessions,
  concurrency,
  declaredStagingHost,
}) {
  const classified = classifyTarget(target);

  if (!Number.isInteger(sessions) || sessions < 1) {
    throw new Error('sessions must be a positive integer.');
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('concurrency must be a positive integer.');
  }

  if (classified.isProduction) {
    if (confirmation !== 'production-pilot') {
      throw new Error('Production requires VIRTUAL_TRAFFIC_CONFIRM=production-pilot.');
    }
    if (sessions > 20 || concurrency > 1) {
      throw new Error('Production pilot is capped at 20 sessions and concurrency 1.');
    }
    return { ...classified, mode: 'production-pilot', allowMap: false };
  }

  if (confirmation !== 'staging-only') {
    throw new Error('Non-production traffic requires VIRTUAL_TRAFFIC_CONFIRM=staging-only.');
  }
  if (!declaredStagingHost || classified.hostname !== declaredStagingHost) {
    throw new Error('Target must exactly match VIRTUAL_TRAFFIC_STAGING_HOST.');
  }
  if (!classified.hostname.endsWith('.vercel.app')) {
    throw new Error('Staging target must be an explicit Vercel deployment hostname.');
  }
  if (sessions > 1000 || concurrency > 20) {
    throw new Error('Staging browser traffic is capped at 1000 sessions and concurrency 20.');
  }

  return { ...classified, mode: 'staging', allowMap: true };
}

export function assertStagingDependencies({ mode, observedUrls }) {
  if (mode !== 'staging') return;
  const productionDependency = observedUrls.find(url => url.includes(PRODUCTION_SUPABASE_REF));
  if (productionDependency) {
    throw new Error('Staging Vercel target references production Supabase; traffic aborted.');
  }
}
