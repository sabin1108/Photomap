export const isPublicDemo =
  (import.meta.env.VITE_PUBLIC_DEMO ?? 'true').toLowerCase() !== 'false';

export const demoUserId = import.meta.env.VITE_DEMO_USER_ID || '';

export const localFavoriteStorageKey = demoUserId
  ? `photomap-demo-favorites:${demoUserId}`
  : 'photomap-demo-favorites';
