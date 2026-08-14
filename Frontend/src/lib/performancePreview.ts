const productionHosts = new Set(['photomap-three.vercel.app']);

export const isPerformancePreviewLocation = (hostname: string, search: string) =>
  hostname.includes('perf-image-delivery') ||
  (!productionHosts.has(hostname) &&
    new URLSearchParams(search).has('perfImageMode'));
