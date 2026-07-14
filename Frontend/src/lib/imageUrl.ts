import type { Photo } from "../type";

const publicStorageMarker = "/storage/v1/object/public/";

const toSupabaseTransformUrl = (url: string, width: number, height: number) => {
  if (!url.includes(publicStorageMarker)) return url;

  const [base, objectPath] = url.split(publicStorageMarker);
  if (!base || !objectPath) return url;

  const transformed = new URL(`${base}/storage/v1/render/image/public/${objectPath}`);
  transformed.searchParams.set("width", String(width));
  transformed.searchParams.set("height", String(height));
  transformed.searchParams.set("resize", "cover");
  transformed.searchParams.set("quality", "70");
  return transformed.toString();
};

export const getPhotoImageUrl = (photo: Photo, variant: "thumb" | "full" = "thumb") => {
  if (variant === "full") return photo.url;
  return photo.thumbnail_url || toSupabaseTransformUrl(photo.url, 320, 320);
};