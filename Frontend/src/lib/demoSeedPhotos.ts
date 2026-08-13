import type { Photo } from '../type';

const sourceDemoSeedPhotos: Photo[] = [
  {
    id: 'demo-seed-bangkok-night-road',
    title: 'Bangkok Night Road',
    url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504038632-15-ronaldplett-truck-8190240_1920.jpg?width=320&height=320&resize=cover&quality=70',
    thumbnail_url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504038632-15-ronaldplett-truck-8190240_1920.jpg?width=320&height=320&resize=cover&quality=70',
    location: 'Bangkok',
    lat: 13.7563,
    lng: 100.5018,
    date: 'Demo',
    tags: ['Demo'],
    category: 'Demo',
    isFavorite: false,
    aspectRatio: 'h-[400px]'
  },
  {
    id: 'demo-seed-singapore-night-garden',
    title: 'Singapore Night Garden',
    url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504040125-16-stocksnap-constellations-2609647_1920.jpg?width=320&height=320&resize=cover&quality=70',
    thumbnail_url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504040125-16-stocksnap-constellations-2609647_1920.jpg?width=320&height=320&resize=cover&quality=70',
    location: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
    date: 'Demo',
    tags: ['Demo'],
    category: 'Demo',
    isFavorite: false,
    aspectRatio: 'h-[400px]'
  },
  {
    id: 'demo-seed-sydney-moonrise',
    title: 'Sydney Moonrise',
    url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504036936-14-promo25-milky-way-559641_1920.jpg?width=320&height=320&resize=cover&quality=70',
    thumbnail_url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504036936-14-promo25-milky-way-559641_1920.jpg?width=320&height=320&resize=cover&quality=70',
    location: 'Sydney',
    lat: -33.8688,
    lng: 151.2093,
    date: 'Demo',
    tags: ['Demo'],
    category: 'Demo',
    isFavorite: false,
    aspectRatio: 'h-[400px]'
  },
  {
    id: 'demo-seed-sahara-milky-way',
    title: 'Sahara Milky Way',
    url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504034961-13-pierre9x6-london-5297395_1920.jpg?width=320&height=320&resize=cover&quality=70',
    thumbnail_url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504034961-13-pierre9x6-london-5297395_1920.jpg?width=320&height=320&resize=cover&quality=70',
    location: 'Sahara',
    lat: 23.4162,
    lng: 25.6628,
    date: 'Demo',
    tags: ['Demo'],
    category: 'Demo',
    isFavorite: false,
    aspectRatio: 'h-[400px]'
  },
  {
    id: 'demo-seed-osaka-neon-cloud',
    title: 'Osaka Neon Cloud',
    url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504017939-6-hans-starry-sky-1655503_1920.jpg?width=320&height=320&resize=cover&quality=70',
    thumbnail_url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504017939-6-hans-starry-sky-1655503_1920.jpg?width=320&height=320&resize=cover&quality=70',
    location: 'Osaka',
    lat: 34.6937,
    lng: 135.5023,
    date: 'Demo',
    tags: ['Demo'],
    category: 'Demo',
    isFavorite: false,
    aspectRatio: 'h-[400px]'
  },
  {
    id: 'demo-seed-seoul-night-sky',
    title: 'Seoul Night Sky',
    url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504003794-1-alexander1848-night-sky-9059825_1920.jpg?width=320&height=320&resize=cover&quality=70',
    thumbnail_url: 'https://wmxdaprqassvwboiownd.supabase.co/storage/v1/render/image/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/1783504003794-1-alexander1848-night-sky-9059825_1920.jpg?width=320&height=320&resize=cover&quality=70',
    location: 'Seoul',
    lat: 37.5665,
    lng: 126.9780,
    date: 'Demo',
    tags: ['Demo'],
    category: 'Demo',
    isFavorite: false,
    aspectRatio: 'h-[400px]'
  }
];

const usePerformanceFixtures =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('perf-image-delivery');

export const publicDemoSeedPhotos: Photo[] = sourceDemoSeedPhotos.map((photo, index) => {
  if (!usePerformanceFixtures) return photo;
  const fixtureUrl = `/performance-fixtures/travel-baseline.jpg?photo=${index + 1}`;
  return { ...photo, url: fixtureUrl, thumbnail_url: fixtureUrl };
});
