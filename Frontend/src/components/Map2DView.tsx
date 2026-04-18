import { useState, useEffect, useRef } from 'react';
import { usePhotoStore } from '../store/usePhotoStore';
import { useShallow } from 'zustand/react/shallow';
import { Search, Settings2, Edit2, Trash2, X } from 'lucide-react';
import { cn } from './ui/utils';
import { Drawer } from 'vaul';

interface Map2DViewProps {
  onNavigate?: (view: string) => void;
}

export function Map2DView({ }: Map2DViewProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isIframeReady, setIsIframeReady] = useState(false);

  const { photos, categories } = usePhotoStore(
    useShallow(state => ({ photos: state.photos, categories: state.categories }))
  );
  const updateCategory = usePhotoStore(state => state.updateCategory);
  const deleteCategory = usePhotoStore(state => state.deleteCategory);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = searchKeyword === '' ||
      (photo.title || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (photo.location || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (photo.description || '').toLowerCase().includes(searchKeyword.toLowerCase());

    const matchesCategory = activeFilter === 'all' ||
      photo.category === activeFilter ||
      (photo.tags && photo.tags.includes(activeFilter));

    return matchesSearch && matchesCategory;
  });

  // iframe 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'IFRAME_READY') {
        console.log("📡 Unity Iframe Ready");
        setIsIframeReady(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 데이터 및 설정 전송
  useEffect(() => {
    if (!isIframeReady) return;

    const sendUpdate = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const config = {
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN,
          adminEmail: import.meta.env.VITE_ADMIN_EMAIL,
          adminPassword: import.meta.env.VITE_ADMIN_PASSWORD
        };

        console.log("📤 [Parent] Sending config to iframe:", {
          ...config,
          supabaseKey: config.supabaseKey ? '***' : 'missing',
          mapboxToken: config.mapboxToken ? '***' : 'missing'
        });

        // 마커 데이터 전송
        iframeRef.current.contentWindow.postMessage(
          { type: 'UPDATE_MARKERS', data: filteredPhotos },
          '*'
        );

        // 환경 변수 전송
        iframeRef.current.contentWindow.postMessage(
          { type: 'INIT_CONFIG', data: config },
          '*'
        );
      }
    };

    sendUpdate();

    // 만약 초기화가 안 될 경우를 위해 짧은 간격으로 1회 더 시도
    const timer = setTimeout(sendUpdate, 1000);
    return () => clearTimeout(timer);
  }, [filteredPhotos, isIframeReady]);

  return (
    <div className="w-full h-full relative bg-[#F5F2EB] overflow-hidden flex flex-col">
      {/* 지도 컨트롤 및 헤더 (Iframe 위에 오버레이) */}
      <div className="absolute top-0 left-0 right-0 z-[40] p-4 pt-16 md:p-6 md:pt-6 pointer-events-auto">
        <div className="flex flex-row items-center gap-2 max-w-full">
          <div className="flex-1 flex items-center gap-2 max-w-[85%] lg:max-w-md">
            {/* 검색바 */}
            <div className="flex-1 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50 flex items-center gap-2 overflow-hidden">
              <Search className="w-5 h-5 text-stone-400 ml-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="장소 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-stone-700 placeholder:text-stone-400 w-full"
              />
            </div>

            {/* 필터 및 관리 통합 버튼 */}
            <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <Drawer.Trigger asChild>
                <button className={cn(
                  "p-3 rounded-2xl bg-white/90 backdrop-blur-md border shadow-sm transition-all flex items-center gap-2 flex-shrink-0 group relative",
                  activeFilter !== 'all' ? "border-[#E09F87] text-[#E09F87] pr-4 md:pr-4" : "border-white/50 text-stone-500 hover:text-[#E09F87]"
                )}>
                  <Settings2 className="w-5 h-5" />
                  <span className="text-sm font-medium hidden md:inline max-w-[100px] truncate">
                    {activeFilter === 'all' ? '필터' : activeFilter}
                  </span>
                  {activeFilter !== 'all' && (
                    <div className="md:hidden absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#E09F87] border-2 border-white shadow-sm" />
                  )}
                </button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[100]" />
                <Drawer.Content className="drawer-glass flex flex-col rounded-t-[32px] h-[85vh] fixed bottom-0 left-0 right-0 z-[101] outline-none">
                  <div className="p-4 bg-white/50 rounded-t-[32px] flex-1">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-stone-300 mb-8" />

                    <div className="max-w-md mx-auto h-full flex flex-col">
                      <Drawer.Title className="text-xl font-bold text-stone-800 mb-2 flex items-center justify-between">
                        <span>태그 및 필터</span>
                        <Drawer.Close asChild>
                          <button className="p-2 rounded-full hover:bg-stone-100"><X className="w-5 h-5" /></button>
                        </Drawer.Close>
                      </Drawer.Title>
                      <p className="text-sm text-stone-500 mb-6 font-medium">지도에 표시할 태그를 선택하거나 관리하세요.</p>

                      {/* 드로어 내 검색 */}
                      <div className="bg-stone-100/80 p-3 rounded-2xl flex items-center gap-2 mb-6 border border-stone-200/50">
                        <Search className="w-4 h-4 text-stone-400" />
                        <input
                          type="text"
                          placeholder="태그 검색..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="bg-transparent border-none outline-none text-sm w-full"
                        />
                      </div>

                      {/* 카테고리 목록 */}
                      <div className="overflow-y-auto pr-2 flex-1 no-scrollbar space-y-2">
                        {/* '전체' 옵션 */}
                        <div
                          onClick={() => { setActiveFilter('all'); setIsDrawerOpen(false); }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border",
                            activeFilter === 'all' ? "bg-[#E09F87]/10 border-[#E09F87]/30" : "bg-white border-stone-100 hover:border-stone-200"
                          )}
                        >
                          <span className={cn("text-sm font-bold", activeFilter === 'all' ? "text-[#E09F87]" : "text-stone-700")}>전체 보기</span>
                          {activeFilter === 'all' && <div className="w-2 h-2 rounded-full bg-[#E09F87]" />}
                        </div>

                        {categories
                          .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map(cat => (
                            <div
                              key={cat}
                              onClick={(e) => {
                                // Prevent trigger if clicking on action buttons
                                if ((e.target as HTMLElement).closest('.action-btn')) return;
                                setActiveFilter(cat);
                                setIsDrawerOpen(false);
                              }}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border group/item",
                                activeFilter === cat ? "bg-[#E09F87]/10 border-[#E09F87]/30" : "bg-white border-stone-100 hover:border-stone-200"
                              )}
                            >
                              <span className={cn("text-sm font-medium", activeFilter === cat ? "text-[#E09F87] font-bold" : "text-stone-700")}>{cat}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = prompt("새로운 태그 이름을 입력하세요:", cat);
                                    if (newName && newName !== cat) updateCategory?.(cat, newName);
                                  }}
                                  className="action-btn p-2 text-stone-400 hover:text-blue-500 transition-colors opacity-0 group-hover/item:opacity-100"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`'${cat}' 태그를 정말 삭제하시겠습니까? 연결된 사진 속 태그도 사라집니다.`)) {
                                      deleteCategory?.(cat);
                                    }
                                  }}
                                  className="action-btn p-2 text-stone-400 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {activeFilter === cat && <div className="w-2 h-2 rounded-full bg-[#E09F87] ml-2" />}
                              </div>
                            </div>
                          ))}

                        {categories.length === 0 && (
                          <div className="text-center py-20 text-stone-400">
                            등록된 태그가 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </div>
        </div>
      </div>

      {/* Unity + Mapbox Iframe 영역 */}
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


