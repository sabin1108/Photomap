import { isPerformancePreviewLocation } from './performancePreview';

export const isPublicDemo =
  (import.meta.env.VITE_PUBLIC_DEMO ?? 'true').toLowerCase() !== 'false';

export const demoUserId = import.meta.env.VITE_DEMO_USER_ID || '';

export const isPerformancePreview =
  typeof window !== 'undefined' &&
  isPerformancePreviewLocation(window.location.hostname, window.location.search);

export const performanceImageMode =
  isPerformancePreview &&
  new URLSearchParams(window.location.search).get('perfImageMode') === 'baseline'
    ? 'baseline'
    : 'optimized';

export const localFavoriteStorageKey = demoUserId
  ? `photomap-demo-favorites:${demoUserId}`
  : 'photomap-demo-favorites';
