export interface ImageVariantSet {
  display: Blob;
  thumbnail: Blob;
}

export interface ImageVariantPaths {
  original: string;
  display: string;
  thumbnail: string;
}

const renderVariant = (source: ImageBitmap, maxDimension: number, quality: number): Promise<Blob> => {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지 변환용 Canvas를 만들 수 없습니다.');
  context.drawImage(source, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('WebP 이미지 변환에 실패했습니다.')),
      'image/webp',
      quality,
    );
  });
};

export const createImageVariants = async (file: File): Promise<ImageVariantSet> => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const [display, thumbnail] = await Promise.all([
      renderVariant(bitmap, 1600, 0.8),
      renderVariant(bitmap, 480, 0.72),
    ]);
    return { display, thumbnail };
  } finally {
    bitmap.close();
  }
};

const safeStem = (fileName: string) => {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  return withoutExtension.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'photo';
};

const safeExtension = (fileName: string) => {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return match?.[1] || 'jpg';
};

export const buildImageVariantPaths = (fileName: string, uploadId: string): ImageVariantPaths => {
  const directory = `uploads/${uploadId}-${safeStem(fileName)}`;
  return {
    original: `${directory}/original.${safeExtension(fileName)}`,
    display: `${directory}/display.webp`,
    thumbnail: `${directory}/thumb.webp`,
  };
};
