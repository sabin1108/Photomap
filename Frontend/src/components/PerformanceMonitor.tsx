import { useEffect, useState } from 'react';
import { usePhotoStore } from '../store/usePhotoStore';

export function PerformanceMonitor() {
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
      
      // Update stats every second
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
        
        setDomCount(document.getElementsByTagName('*').length);
        
        // Window.performance.memory is a Chrome-specific API
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
    <div className="fixed bottom-4 right-4 z-[9999] bg-stone-900/90 text-emerald-400 font-mono text-[11px] p-3 rounded-xl pointer-events-none backdrop-blur-md border border-stone-700 shadow-2xl flex flex-col gap-1.5 w-44">
      <div className="text-stone-300 font-bold mb-1 border-b border-stone-700 pb-1.5 uppercase tracking-wider text-[10px]">
        📊 Live Diagnostics
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
        <span className="text-stone-400">DOM Nodes:</span> 
        <span className="text-blue-400 font-bold">{domCount.toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-stone-400">Memory:</span> 
        <span className="text-purple-400 font-bold">{memory}</span>
      </div>
    </div>
  );
}
