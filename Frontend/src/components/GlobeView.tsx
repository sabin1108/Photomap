import createGlobe from 'cobe';
import { useEffect, useRef, useMemo } from 'react';
import { useSpring } from 'motion/react';
import { usePhotoStore } from '../store/usePhotoStore';



export function GlobeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const photos = usePhotoStore(state => state.photos);

  // Motion/react spring 엔진 사용
  const r = useSpring(0, {
    mass: 1,
    stiffness: 280,
    damping: 40,
  });

  const markers = useMemo(() => {
    return photos
      .filter(photo => photo.lat !== undefined && photo.lng !== undefined)
      .map(photo => ({
        location: [photo.lat!, photo.lng!] as [number, number],
        size: 0.05
      }));
  }, [photos]);

  useEffect(() => {
    let width = 0;
    const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 4.5,
      theta: 0.35,
      dark: 0,
      diffuse: 2,
      mapSamples: 12000, // 최적화: 20000 -> 12000
      mapBrightness: 8,
      baseColor: [0.98, 0.96, 0.91],
      markerColor: [1, 0.55, 0.45],
      glowColor: [1, 0.95, 0.8],
      markers: markers,
      onRender: (state) => {
        state.phi = 4.5 + r.get();
        state.width = width * 2;
        state.height = width * 2;
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

        <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-50">
          <div className="text-[10px] uppercase tracking-widest text-[#E09F87]">
            Lat 35.9° N / Long 127.7° E
          </div>
        </div>
      </div>
    </div>
  );
}
