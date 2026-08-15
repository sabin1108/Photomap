const PUBLIC_DEMO_IMAGE_VERSION = 'v1';
const PUBLIC_DEMO_STORAGE_ORIGIN = 'https://wmxdaprqassvwboiownd.supabase.co';
const PUBLIC_DEMO_STORAGE_DIRECTORY =
  '/storage/v1/object/public/photo-uploads/demo/3a338b01-a8c5-4071-a50f-ab6d6787eec7/';

export const publicDemoImageManifest = [
  { id: 1, fileName: '1783504003794-1-alexander1848-night-sky-9059825_1920.jpg' },
  { id: 2, fileName: '1783504007487-2-bessi-tree-736875_1920.jpg' },
  { id: 3, fileName: '1783504009464-3-decster1-hd-wallpaper-8853669_1920.png' },
  { id: 4, fileName: '1783504012786-4-felix-mittermeier-night-photograph-2183637_1920.jpg' },
  { id: 5, fileName: '1783504014914-5-geralt-stars-2643089_1920.jpg' },
  { id: 6, fileName: '1783504017939-6-hans-starry-sky-1655503_1920.jpg' },
  { id: 7, fileName: '1783504019453-7-jonathanpayne-astronomy-10324870_1920.jpg' },
  { id: 8, fileName: '1783504020660-8-papaya45-sun-377796_1920.jpg' },
  { id: 9, fileName: '1783504023165-9-pexels-astronomy-1868065_1920.jpg' },
  { id: 10, fileName: '1783504027121-10-pexels-aurora-borealis-1839582_1920.jpg' },
  { id: 11, fileName: '1783504028519-11-pexels-stars-1869447_1920.jpg' },
  { id: 12, fileName: '1783504033202-12-photo-graphe-moon-2762111_1920.jpg' },
  { id: 13, fileName: '1783504034961-13-pierre9x6-london-5297395_1920.jpg' },
  { id: 14, fileName: '1783504036936-14-promo25-milky-way-559641_1920.jpg' },
  { id: 15, fileName: '1783504038632-15-ronaldplett-truck-8190240_1920.jpg' },
  { id: 16, fileName: '1783504040125-16-stocksnap-constellations-2609647_1920.jpg' },
] as const;

const demoImageByFileName = new Map<string, (typeof publicDemoImageManifest)[number]>(
  publicDemoImageManifest.map(image => [image.fileName, image]),
);

export const getPublicDemoSourceUrl = (fileName: string) =>
  `${PUBLIC_DEMO_STORAGE_ORIGIN}${PUBLIC_DEMO_STORAGE_DIRECTORY}${fileName}`;

export const resolvePublicDemoImageUrls = (sourceUrl: string) => {
  try {
    const url = new URL(sourceUrl);
    if (url.origin !== PUBLIC_DEMO_STORAGE_ORIGIN) return null;

    const objectPath = url.pathname.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
    if (!objectPath.startsWith(PUBLIC_DEMO_STORAGE_DIRECTORY)) return null;

    const fileName = objectPath.slice(PUBLIC_DEMO_STORAGE_DIRECTORY.length);
    const image = demoImageByFileName.get(fileName);
    if (!image) return null;

    const base = `/demo-images/${PUBLIC_DEMO_IMAGE_VERSION}/${image.id}`;
    return {
      display: `${base}-display.webp`,
      thumbnail: `${base}-thumb.webp`,
    };
  } catch {
    return null;
  }
};
