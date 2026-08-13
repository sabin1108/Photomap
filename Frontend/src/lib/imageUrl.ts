import type { Photo } from "../type";

export const getPhotoImageUrl = (photo: Photo, variant: "thumb" | "full" = "thumb") => {
  if (variant === "full") return normalizeLegacyImageUrl(photo.url);
  return normalizeLegacyImageUrl(photo.thumbnail_url || photo.url);
};

export const getGridImageLoadingPolicy = (photoIndex: number, columns: number) => ({
  loading: photoIndex < Math.max(columns, 1) ? 'eager' as const : 'lazy' as const,
  fetchPriority: photoIndex === 0 ? 'high' as const : 'auto' as const,
});

export const normalizeLegacyImageUrl = (url: string) => {
  const legacyMarker = '/storage/v1/render/image/public/';
  if (!url.includes(legacyMarker)) return url;

  const [base, objectPathWithQuery] = url.split(legacyMarker);
  const objectPath = objectPathWithQuery?.split('?')[0];
  if (!base || !objectPath) return url;
  return base + '/storage/v1/object/public/' + objectPath;
};

export const getReliablePhotoImageUrl = (
  photo: Photo,
  variant: 'thumb' | 'full' = 'thumb',
) => getPhotoImageUrl(photo, variant);
