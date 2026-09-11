import type { Photo } from '../type';
import { isPerformancePreview, performanceImageMode } from './demoConfig';
import { getPublicDemoSourceUrl, publicDemoImageManifest, resolvePublicDemoImageUrls } from './publicDemoImages';

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


// Locations are illustrative demo metadata, not captured EXIF.
const additionalDemoPhotos: Photo[] = [
  { imageId: 2, title: 'Seoul Starlit Tree', location: 'Seoul', lat: 37.5665, lng: 126.9780, category: '자연' },
  { imageId: 3, title: 'Singapore Evening Sky', location: 'Singapore', lat: 1.3521, lng: 103.8198, category: '밤하늘' },
  { imageId: 4, title: 'Osaka Night Photograph', location: 'Osaka', lat: 34.6937, lng: 135.5023, category: '밤하늘' },
  { imageId: 5, title: 'Sahara Stars', location: 'Sahara', lat: 23.4162, lng: 25.6628, category: '밤하늘' },
  { imageId: 7, title: 'Sydney Astronomy', location: 'Sydney', lat: -33.8688, lng: 151.2093, category: '밤하늘' },
  { imageId: 8, title: 'Bangkok Sun', location: 'Bangkok', lat: 13.7563, lng: 100.5018, category: '자연' },
  { imageId: 9, title: 'Sahara Astronomy', location: 'Sahara', lat: 23.4162, lng: 25.6628, category: '밤하늘' },
  { imageId: 10, title: 'Sydney Aurora', location: 'Sydney', lat: -33.8688, lng: 151.2093, category: '자연' },
  { imageId: 11, title: 'Singapore Stars', location: 'Singapore', lat: 1.3521, lng: 103.8198, category: '밤하늘' },
  { imageId: 12, title: 'Seoul Moon', location: 'Seoul', lat: 37.5665, lng: 126.9780, category: '밤하늘' },
].map(({ imageId, ...metadata }) => {
  const image = publicDemoImageManifest.find(item => item.id === imageId)!;
  const url = getPublicDemoSourceUrl(image.fileName);
  return {
    ...metadata,
    id: 'demo-seed-image-' + imageId,
    url,
    thumbnail_url: url,
    date: 'Demo',
    tags: ['Demo', metadata.category, metadata.location],
    description: '기존 데모 사진입니다. 위치는 지도·앨범 탐색을 위한 예시 위치이며 실제 촬영 위치를 뜻하지 않습니다.',
    isFavorite: false,
    aspectRatio: 'h-[400px]',
  };
});

const demoPhotos = isPerformancePreview ? sourceDemoSeedPhotos : [
  ...sourceDemoSeedPhotos.map(photo => ({
    ...photo,
    tags: ['Demo', '밤하늘', photo.location],
    category: '밤하늘',
    description: '기존 데모 사진입니다. 위치는 지도·앨범 탐색을 위한 예시 위치이며 실제 촬영 위치를 뜻하지 않습니다.',
  })),
  ...additionalDemoPhotos,
];

export const publicDemoSeedCategories = [...new Set(demoPhotos.map(photo => photo.category).filter((category): category is string => Boolean(category)))];

export const publicDemoSeedPhotos: Photo[] = demoPhotos.map((photo, index) => {
  if (!isPerformancePreview) {
    const images = resolvePublicDemoImageUrls(photo.url);
    return images ? { ...photo, url: images.display, thumbnail_url: images.thumbnail } : photo;
  }
  if (performanceImageMode === 'baseline') {
    const baseline = `/performance-fixtures/travel-baseline.jpg?photo=${index + 1}`;
    return { ...photo, url: baseline, thumbnail_url: baseline };
  }
  return {
    ...photo,
    url: `/performance-fixtures/travel-display.webp?photo=${index + 1}`,
    thumbnail_url: `/performance-fixtures/travel-thumb.webp?photo=${index + 1}`,
  };
});
