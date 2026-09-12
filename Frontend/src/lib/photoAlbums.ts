import type { Photo } from '../type';
import { getPhotoImageUrl } from './imageUrl.ts';

export type AlbumKind = 'system' | 'place' | 'collection';

export interface PhotoAlbum {
  id: string;
  title: string;
  cover: string;
  count: number;
  date: string;
  kind: AlbumKind;
  isLocation?: boolean;
}

interface AlbumAccumulator {
  id: string;
  title: string;
  count: number;
  latestPhoto?: Photo;
  latestTime: number;
  kind: AlbumKind;
  isLocation?: boolean;
}

const emptyDate = '비어 있음';
const newItemDate = '새 항목';

const photoTime = (photo: Photo) => {
  const time = new Date(photo.date).getTime();
  return Number.isFinite(time) ? time : 0;
};

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const rememberPhoto = (album: AlbumAccumulator, photo: Photo) => {
  const time = photoTime(photo);
  album.count += 1;
  if (!album.latestPhoto || time > album.latestTime) {
    album.latestPhoto = photo;
    album.latestTime = time;
  }
};

const toAlbum = (album: AlbumAccumulator): PhotoAlbum => ({
  id: album.id,
  title: album.title,
  cover: album.latestPhoto ? getPhotoImageUrl(album.latestPhoto, 'thumb') : '',
  count: album.count,
  date: album.latestPhoto?.date || newItemDate,
  kind: album.kind,
  isLocation: album.isLocation,
});

export function buildPhotoAlbums(photos: Photo[], categories: string[]) {
  const placeAlbums = new Map<string, AlbumAccumulator>();
  const collectionAlbums = new Map<string, AlbumAccumulator>();
  const categorySet = new Set(categories);
  let favoritePhoto: Photo | undefined;
  let favoriteCount = 0;

  for (const category of categories) {
    collectionAlbums.set(category, {
      id: category,
      title: titleCase(category),
      count: 0,
      latestTime: 0,
      kind: 'collection',
    });
  }

  for (const photo of photos) {
    if (photo.isFavorite) {
      favoriteCount += 1;
      if (!favoritePhoto) favoritePhoto = photo;
    }

    if (photo.location) {
      const existing = placeAlbums.get(photo.location) ?? {
        id: `loc_${photo.location}`,
        title: photo.location,
        count: 0,
        latestTime: 0,
        kind: 'place' as const,
        isLocation: true,
      };
      rememberPhoto(existing, photo);
      placeAlbums.set(photo.location, existing);
    }

    const matchedCategories = new Set<string>();
    if (categorySet.has(photo.category)) matchedCategories.add(photo.category);
    for (const tag of photo.tags) {
      if (categorySet.has(tag)) matchedCategories.add(tag);
    }

    for (const category of matchedCategories) {
      const album = collectionAlbums.get(category);
      if (album) rememberPhoto(album, photo);
    }
  }

  const system: PhotoAlbum[] = [
    {
      id: 'system_all',
      title: '전체 사진',
      cover: photos[0] ? getPhotoImageUrl(photos[0], 'thumb') : '',
      count: photos.length,
      date: photos[0]?.date || emptyDate,
      kind: 'system',
    },
    {
      id: 'system_favorites',
      title: '좋아요',
      cover: favoritePhoto ? getPhotoImageUrl(favoritePhoto, 'thumb') : '',
      count: favoriteCount,
      date: favoritePhoto?.date || emptyDate,
      kind: 'system',
    },
  ];

  return {
    system,
    places: Array.from(placeAlbums.values()).map(toAlbum).sort((a, b) => b.count - a.count),
    collections: Array.from(collectionAlbums.values()).map(toAlbum),
  };
}
