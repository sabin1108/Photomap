import { useState, useEffect, useRef } from 'react';
import { usePhotoContext } from '../context/PhotoContext';
import { Search } from 'lucide-react';
import { cn } from './ui/utils';

interface Map2DViewProps {
  onNavigate?: (view: string) => void;
}

export function Map2DView({ onNavigate }: Map2DViewProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const { photos, categories } = usePhotoContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 1. 검색 및 카테고리에 따른 필터링 로직
  const filteredPhotos = photos.filter(photo => {
      // 텍스트 검색 (제목, 설명, 위치 등 통합 검색)
      const matchesSearch = searchKeyword === '' || 
        (photo.title || '').toLowerCase().includes(searchKeyword.toLowerCase()) || 
        (photo.location || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (photo.description || '').toLowerCase().includes(searchKeyword.toLowerCase());
      
      // 카테고리 필터
      const matchesCategory = activeFilter === 'all' || photo.category === activeFilter;
      
      return matchesSearch && matchesCategory;
  });

  // 2. 필터링된 데이터 묶음을 Unity Iframe에 postMessage로 전송
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'UPDATE_MARKERS', data: filteredPhotos }, 
        '*'
      );
    }
  }, [filteredPhotos]);

  return (
    <div className="w-full h-full relative bg-[#F5F2EB] overflow-hidden flex flex-col">
      {/* Map Controls / Header (Overlayed on Iframe) */}
      <div className="absolute top-0 left-0 right-0 z-[40] p-4 pt-16 md:p-6 md:pt-6 pointer-events-none">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50 flex items-center gap-2">
            <Search className="w-5 h-5 text-stone-400 ml-2" />
            <input
              type="text"
              placeholder="장소 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-stone-700 placeholder:text-stone-400 w-48 md:w-64"
            />
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 md:gap-2 max-w-full justify-start lg:justify-end">
            {['all', ...categories].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-3 py-1 md:px-4 md:py-2 rounded-full text-[11px] md:text-xs font-medium capitalize transition-all border shadow-sm",
                  activeFilter === filter
                    ? "bg-[#E09F87] text-white border-[#E09F87]"
                    : "bg-white/90 backdrop-blur-sm text-stone-600 border-white/50 hover:bg-white"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unity + Mapbox Iframe Area */}
      <div className="flex-1 relative w-full h-full bg-[#EBE6DA]">
        <iframe 
          ref={iframeRef}
          src="/unity-map/index.html" 
          title="Unity Mapbox View"
          className="w-full h-full border-none outline-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}


