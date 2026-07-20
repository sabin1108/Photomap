import createGlobe from 'cobe';
import { useEffect, useRef, useMemo } from 'react';
import { useSpring } from 'motion/react';
import { usePhotoStore } from '../store/usePhotoStore';
import { useFrameBudgetProbe } from '../lib/frameBudgetProfiler';

const readNumberEnv = (key: string, fallback: number) => {
  const raw = import.meta.env[key];
  const value = raw ? Number(raw) : fallback;
  return Number.isFinite(value) ? value : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const globeDevicePixelRatio = clamp(readNumberEnv('VITE_GLOBE_DEVICE_PIXEL_RATIO', 1.5), 1, 2);
const globeMapSamples = Math.round(clamp(readNumberEnv('VITE_GLOBE_MAP_SAMPLES', 8000), 4000, 12000));
const globeMarkerLimit = Math.round(clamp(readNumberEnv('VITE_GLOBE_MARKER_LIMIT', 120), 20, 300));
const globeMarkerSize = clamp(readNumberEnv('VITE_GLOBE_MARKER_SIZE', 0.045), 0.02, 0.08);

export function GlobeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const photos = usePhotoStore(state => state.photos);
  useFrameBudgetProbe('GlobeView:cobe-canvas');

  const r = useSpring(0, {
    mass: 1,
    stiffness: 280,
    damping: 40,
  });

  const markers = useMemo(() => {
    return photos
      .filter(photo => typeof photo.lat === 'number' && typeof photo.lng === 'number' && Number.isFinite(photo.lat) && Number.isFinite(photo.lng))
      .slice(0, globeMarkerLimit)
      .map(photo => ({
        location: [photo.lat!, photo.lng!] as [number, number],
        size: globeMarkerSize
      }));
  }, [photos]);

  const markerCount = markers.length;

  useEffect(() => {
    let width = 0;
    const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: globeDevicePixelRatio,
      width: width * globeDevicePixelRatio,
      height: width * globeDevicePixelRatio,
      phi: 4.5,
      theta: 0.35,
      dark: 0,
      diffuse: 2,
      mapSamples: globeMapSamples,
      mapBrightness: 8,
      baseColor: [0.98, 0.96, 0.91],
      markerColor: [1, 0.55, 0.45],
      glowColor: [1, 0.95, 0.8],
      markers,
      onRender: (state) => {
        state.phi = 4.5 + r.get();
        state.width = width * globeDevicePixelRatio;
        state.height = width * globeDevicePixelRatio;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = '1';
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [markers, r]);

  return (
    <div className="w-full h-full flex items-center justify-center relative z-0">
      <div className="w-full max-w-[800px] aspect-square relative">
        <canvas
          ref={canvasRef}
          className="cursor-grab active:cursor-grabbing"
          style={{ width: '100%', height: '100%', contain: 'layout paint size', opacity: 0, transition: 'opacity 1s ease' }}
          onPointerDown={(e) => {
            pointerInteracting.current = e.clientX - r.get() * 200;
          }}
          onPointerUp={() => {
            pointerInteracting.current = null;
          }}
          onPointerOut={() => {
            pointerInteracting.current = null;
          }}
          onMouseMove={(e) => {
            if (pointerInteracting.current !== null) {
              const delta = e.clientX - pointerInteracting.current;
              r.set(delta / 200);
            }
          }}
          onTouchStart={(e) => {
            if (e.touches[0]) {
              pointerInteracting.current = e.touches[0].clientX - r.get() * 200;
            }
          }}
          onTouchMove={(e) => {
            if (pointerInteracting.current !== null && e.touches[0]) {
              const delta = e.touches[0].clientX - pointerInteracting.current;
              r.set(delta / 200);
            }
          }}
          onTouchEnd={() => {
            pointerInteracting.current = null;
          }}
        />

        <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-70">
          <div className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-medium text-stone-500 shadow-sm">
            위치 표시 {markerCount}개
          </div>
        </div>
        {markerCount === 0 && (
          <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/80 px-4 py-3 text-center text-xs text-stone-500 shadow-sm backdrop-blur-md">
            위치 정보가 있는 사진을 로드하면 글로브에 표시합니다.
          </div>
        )}
      </div>
    </div>
  );
}
