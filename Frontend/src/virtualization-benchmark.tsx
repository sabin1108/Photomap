import { createRoot } from 'react-dom/client';
import { PhotoFeed } from './components/PhotoFeed';
import { usePhotoStore } from './store/usePhotoStore';
import './index.css';

const query = new URLSearchParams(window.location.search);
const mode = query.get('mode');
const count = Number(query.get('count'));
if ((mode !== 'all' && mode !== 'virtual') || ![1000, 3000].includes(count)) {
  throw new Error('Expected mode=all|virtual and count=1000|3000');
}
const fixture = query.get('fixture') ?? 'svg';
if (!['svg', 'real'].includes(fixture)) throw new Error('Unknown fixture');
const manifest = fixture === 'real'
  ? await fetch('/real-fixtures/v1/fixture-manifest.json').then(response => {
    if (!response.ok) throw new Error('Real fixture manifest unavailable');
    return response.json();
  })
  : null;
const images: { url: string; thumbnail_url: string }[] | undefined = manifest?.fixtures;
if (fixture === 'real' && (!Array.isArray(images) || images.length !== 1000)) {
  throw new Error('Real fixture requires exactly 1000 manifest images');
}
// Opt-in isolated fixture: no App initialization, authentication or API reads.
const photos = Array.from({ length: count }, (_, index) => ({
  id: `fixture-${String(index + 1).padStart(4, '0')}`,
  title: `Fixture ${String(index + 1).padStart(4, '0')}`,
  url: images ? images[index % images.length].url : '/virtualization-fixtures/tile.svg',
  thumbnail_url: images ? images[index % images.length].thumbnail_url : '/virtualization-fixtures/tile.svg',
  location: 'Benchmark location',
  date: '2026-09-09',
  tags: ['benchmark'],
  category: 'benchmark',
  isFavorite: false,
}));
usePhotoStore.setState({ photos, categories: ['benchmark'], isInitialized: true, isLoading: false, loadError: null, hasMore: false });
createRoot(document.getElementById('root')!).render(
  <div style={{ height: '100vh', width: '100%' }}>
    <PhotoFeed benchmarkMode={mode} filterCategory="benchmark" hideHeader isReadOnlyDemo />
  </div>,
);
