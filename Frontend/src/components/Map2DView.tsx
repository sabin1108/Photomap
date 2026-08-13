import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePhotoStore } from '../store/usePhotoStore';
import { useShallow } from 'zustand/react/shallow';
import { Search, Settings2, Edit2, Trash2, X, MapPin, Eye } from 'lucide-react';
import { cn } from './ui/utils';
import { Drawer } from 'vaul';
import type { Photo } from '../type';
import { getPhotoImageUrl } from '../lib/imageUrl';
import { PhotoModal } from './ui/photo-modal';

interface Map2DViewProps {
  onNavigate?: (view: string) => void;
  isReadOnlyDemo?: boolean;
}

interface MapMarkerPayload {
  id: string;
  lat: number;
  lng: number;
  url: string;
  thumbnail_url: string;
}

const hasValidCoordinates = (photo: Photo) =>
  typeof photo.lat === 'number' &&
  typeof photo.lng === 'number' &&
  Number.isFinite(photo.lat) &&
  Number.isFinite(photo.lng) &&
  !(photo.lat === 0 && photo.lng === 0);

export function Map2DView({ isReadOnlyDemo = false }: Map2DViewProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [detailPhoto, setDetailPhoto] = useState<Photo | null>(null);
  const [focusStatus, setFocusStatus] = useState<'waiting' | 'moving' | 'focused'>('waiting');

  const { photos, categories, isLoading } = usePhotoStore(
    useShallow(state => ({
      photos: state.photos,
      categories: state.categories,
      isLoading: state.isLoading
    }))
  );
  const updateCategory = usePhotoStore(state => state.updateCategory);
  const deleteCategory = usePhotoStore(state => state.deleteCategory);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingPayloadRef = useRef<{
    markers: MapMarkerPayload[];
    config: { mapboxToken: string | undefined };
  } | null>(null);
  const pendingFocusPhotoRef = useRef<Photo | null>(null);

  const filteredPhotos = useMemo(() => photos.filter(photo => {
    const matchesSearch = searchKeyword === '' ||
      (photo.title || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (photo.location || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (photo.description || '').toLowerCase().includes(searchKeyword.toLowerCase());

    const matchesCategory = activeFilter === 'all' ||
      photo.category === activeFilter ||
      (photo.tags && photo.tags.includes(activeFilter));

    return matchesSearch && matchesCategory;
  }), [activeFilter, photos, searchKeyword]);

  const mapPhotos = useMemo(() => filteredPhotos.filter(hasValidCoordinates), [filteredPhotos]);
  const mapMarkers = useMemo<MapMarkerPayload[]>(() => mapPhotos.map(photo => ({
    id: photo.id,
    lat: photo.lat!,
    lng: photo.lng!,
    url: getPhotoImageUrl(photo, 'thumb'),
    thumbnail_url: getPhotoImageUrl(photo, 'thumb')
  })), [mapPhotos]);
  const photosWithoutCoordinates = filteredPhotos.length - mapPhotos.length;
  const previewPhotos = useMemo(() => mapPhotos.slice(0, 8), [mapPhotos]);
  const selectedPhoto = useMemo(
    () => mapPhotos.find(photo => photo.id === selectedPhotoId) ?? mapPhotos[0] ?? null,
    [mapPhotos, selectedPhotoId]
  );

  const buildIframePayload = useCallback(() => ({
    markers: mapMarkers,
    config: {
      mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN
    }
  }), [mapMarkers]);

  const postIframePayload = useCallback((payload: ReturnType<typeof buildIframePayload>) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) {
      pendingPayloadRef.current = payload;
      return false;
    }

    target.postMessage(
      { type: 'INIT_CONFIG', data: payload.config },
      '*'
    );

    target.postMessage(
      { type: 'UPDATE_MARKERS', data: payload.markers },
      '*'
    );

    return true;
  }, []);

  const postPhotoFocus = useCallback((photo: Photo) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return false;

    target.postMessage({
      type: 'FOCUS_PHOTO',
      data: { id: photo.id, lat: photo.lat, lng: photo.lng }
    }, '*');

    setFocusStatus('moving');
    return true;
  }, []);

  const requestIframeReady = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_IFRAME_READY' }, '*');
  }, []);

  // iframe 메시지 수신
  useLayoutEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data.type === 'IFRAME_READY') {
        setIsIframeReady(true);
      }

      if (event.data.type === 'PHOTO_FOCUSED') {
        setSelectedPhotoId(String(event.data.data.id));
        setFocusStatus('focused');
      }

      if (event.data.type === 'MAP_PHOTO_SELECTED') {
        setSelectedPhotoId(String(event.data.data.id));
        setFocusStatus('focused');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 데이터 및 설정 전송
  useEffect(() => {
    const payload = buildIframePayload();
    pendingPayloadRef.current = payload;

    if (!isIframeReady || isLoading) return;

    const sendUpdate = () => {
      const pendingPayload = pendingPayloadRef.current;
      if (pendingPayload && postIframePayload(pendingPayload)) {
        pendingPayloadRef.current = null;
      }
    };

    sendUpdate();
  }, [buildIframePayload, isIframeReady, isLoading, postIframePayload]);

  useEffect(() => {
    const pendingPhoto = pendingFocusPhotoRef.current;
    if (!isIframeReady || !pendingPhoto) return;

    if (postPhotoFocus(pendingPhoto)) {
      pendingFocusPhotoRef.current = null;
    }
  }, [isIframeReady, postPhotoFocus]);

  const handlePreviewFocus = useCallback((photo: Photo) => {
    setSelectedPhotoId(photo.id);
    pendingFocusPhotoRef.current = photo;

    if (isIframeReady && postPhotoFocus(photo)) {
      pendingFocusPhotoRef.current = null;
    }
  }, [isIframeReady, postPhotoFocus]);

  return (
    <div className="w-full h-full relative bg-[#F5F2EB] overflow-hidden flex flex-col">
      {/* 지도 컨트롤 및 헤더 (Iframe 위에 오버레이) */}
      <div className="absolute top-0 left-0 right-0 z-[40] p-4 pt-16 md:p-6 md:pt-6 pointer-events-auto">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-2 text-xs font-medium text-stone-600 shadow-sm backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 text-[#E09F87]" />
            <span>지도 표시 {mapPhotos.length}장</span>
            {photosWithoutCoordinates > 0 && (
              <span className="text-stone-400">/ 위치 없음 {photosWithoutCoordinates}장</span>
            )}
          </div>
          {isReadOnlyDemo && (
            <span className="rounded-full border border-stone-200 bg-white/85 px-3 py-2 text-xs font-medium text-stone-500 shadow-sm backdrop-blur-md">
              읽기 전용 지도 탐색
            </span>
          )}
        </div>

        {filteredPhotos.length > 0 && mapPhotos.length === 0 && (
          <div className="mb-3 max-w-md rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-sm backdrop-blur-md">
            이 필터에는 지도에 표시할 사진이 없습니다. 전체 사진이나 다른 태그를 선택해 보세요.
          </div>
        )}
        <div className="flex flex-row items-center gap-2 max-w-full">
          <div className="flex-1 flex items-center gap-2 max-w-[85%] lg:max-w-md">
            {/* 검색바 */}
            <div className="flex-1 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50 flex items-center gap-2 overflow-hidden">
              <Search className="w-5 h-5 text-stone-400 ml-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="장소, 제목, 설명 검색"
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
                        <span>지도 필터</span>
                        <Drawer.Close asChild>
                          <button className="p-2 rounded-full hover:bg-stone-100"><X className="w-5 h-5" /></button>
                        </Drawer.Close>
                      </Drawer.Title>
                      <p className="text-sm text-stone-500 mb-6 font-medium">
                        {isReadOnlyDemo ? '지도에 표시할 태그를 선택하세요.' : '지도에 표시할 태그를 선택하거나 관리하세요.'}
                      </p>

                      {/* 드로어 내 검색 */}
                      <div className="bg-stone-100/80 p-3 rounded-2xl flex items-center gap-2 mb-6 border border-stone-200/50">
                        <Search className="w-4 h-4 text-stone-400" />
                        <input
                          type="text"
                          placeholder="태그 검색"
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
                                {!isReadOnlyDemo && (
                                  <>
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
                                  </>
                                )}
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
        {!isIframeReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#EBE6DA]">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-600">
              <MapPin className="h-4 w-4 text-[#E09F87]" />
              <span>지도 준비 중 · 사진 위치 {mapPhotos.length}개</span>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src="/unity-map/index.html"
          onLoad={requestIframeReady}
          title="Unity Mapbox View"
          className="w-full h-full border-none outline-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="eager"
        />
      </div>

      {previewPhotos.length > 0 && (
        <section
          data-testid="map-photo-preview-list"
          aria-label="지도 사진 미리보기"
          className="pointer-events-auto absolute bottom-20 left-3 right-3 z-[30] rounded-3xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur-xl md:bottom-5 md:left-6 md:right-6"
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-stone-700">
                {selectedPhoto?.title || '사진 위치 탐색'}
              </p>
              <p
                data-testid="map-focus-status"
                aria-live="polite"
                className="truncate text-[11px] text-stone-500"
              >
                {focusStatus === 'focused'
                  ? '지도 이동 완료'
                  : focusStatus === 'moving'
                    ? '선택한 사진 위치로 이동 중'
                    : '대표 사진 위치를 찾는 중'}
                {selectedPhoto?.location ? ` · ${selectedPhoto.location}` : ''}
              </p>
            </div>
            {selectedPhoto && (
              <button
                type="button"
                onClick={() => setDetailPhoto(selectedPhoto)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-stone-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-700"
              >
                <Eye className="h-3.5 w-3.5" />
                사진 상세 보기
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {previewPhotos.map(photo => {
              const isSelected = selectedPhoto?.id === photo.id;
              return (
                <button
                  key={photo.id}
                  type="button"
                  aria-label={`${photo.title || '제목 없는 사진'} 위치로 이동`}
                  aria-pressed={isSelected}
                  onClick={() => handlePreviewFocus(photo)}
                  className={cn(
                    'relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-stone-200 transition-all md:h-20 md:w-20',
                    isSelected
                      ? 'border-[#E09F87] ring-2 ring-[#E09F87]/25'
                      : 'border-white hover:border-stone-300'
                  )}
                >
                  <img
                    src={getPhotoImageUrl(photo, 'thumb')}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </section>
      )}

      <PhotoModal.Root photo={detailPhoto} onClose={() => setDetailPhoto(null)}>
        <PhotoModal.Image />
        <PhotoModal.Panel>
          <PhotoModal.Header />
          <PhotoModal.Metadata isReadOnly={isReadOnlyDemo} />
        </PhotoModal.Panel>
      </PhotoModal.Root>
    </div>
  );
}
