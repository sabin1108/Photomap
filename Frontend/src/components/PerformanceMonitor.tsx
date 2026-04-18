import { useEffect, useState } from 'react';
import { usePhotoStore } from '../store/usePhotoStore';
import { Activity, ChevronDown } from 'lucide-react';

export function PerformanceMonitor() {
  const [isOpen, setIsOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const photosCount = usePhotoStore(state => state.photos.length);
  const [domCount, setDomCount] = useState(0);
  const [memory, setMemory] = useState<string>('N/A');

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = () => {
      const now = performance.now();
      frameCount++;

      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;

        setDomCount(document.getElementsByTagName('*').length);

        if ((performance as any).memory) {
          const usedJSHeapSize = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
          setMemory(`${usedJSHeapSize.toFixed(1)} MB`);
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      className={`fixed bottom-4 left-4 md:left-72 z-[9999] bg-stone-900/90 text-emerald-400 font-mono text-[11px] backdrop-blur-md border border-stone-700 shadow-2xl flex flex-col gap-1.5 transition-all duration-300 ease-in-out ${isOpen
          ? 'w-44 p-3 rounded-xl pointer-events-auto'
          : 'w-10 h-10 p-0 rounded-full items-center justify-center cursor-pointer pointer-events-auto hover:bg-stone-800 hover:scale-105 active:scale-95'
        }`}
      onClick={() => !isOpen && setIsOpen(true)}
    >
      {isOpen ? (
        <>
          <div className="flex justify-between items-center mb-1 border-b border-stone-700 pb-1.5 w-full">
            <span className="text-stone-300 font-bold uppercase tracking-wider text-[10px]">📊 Metrics</span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="hover:bg-stone-700 rounded p-0.5 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400">FPS:</span>
            <span className={fps < 30 ? "text-rose-500 font-bold" : "text-emerald-400 font-bold"}>{fps}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400">Photos:</span>
            <span className="text-amber-400 font-bold">{photosCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400">DOM:</span>
            <span className="text-blue-400 font-bold">{domCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-400">Memory:</span>
            <span className="text-purple-400 font-bold">{memory}</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-[8px] font-bold">{fps}</span>
        </div>
      )}
    </div>
  );
}

