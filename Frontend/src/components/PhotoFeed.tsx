import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Folder, CheckCircle2, Trash, Trash2, Move, X, MousePointer2, Heart } from 'lucide-react';
import { cn } from './ui/utils';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { usePhotoStore } from '../store/usePhotoStore';
import { PhotoModal } from './ui/photo-modal';
import { Button } from './ui/button';
import type { Photo } from '../type';
import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useGridBreakpoints } from '../hooks/useGridBreakpoints';
import { useAuthStore } from '../store/useAuthStore';
import { useShallow } from 'zustand/react/shallow';
import { demoUserId, isPublicDemo } from '../lib/demoConfig';
import { getPhotoImageUrl } from '../lib/imageUrl';

interface PhotoFeedProps {
  className?: string;
  filterCategory?: string | null;
  hideHeader?: boolean;
  // 외부에서 선택 모드를 제어하기 위한 props
  isExternalSelectMode?: boolean;
  onSelectModeChange?: (isSelect: boolean) => void;
  isReadOnlyDemo?: boolean;
}

export function PhotoFeed({
  className,
  filterCategory,
  hideHeader,
  isExternalSelectMode,
  onSelectModeChange,
  isReadOnlyDemo
}: PhotoFeedProps) {
  const {
    photos,
    isLoading,
    loadError,
    hasMore,
    fetchMorePhotos,
    toggleFavorite,
    deletePhoto,
    batchDeletePhotos,
    batchMovePhotos,
    categories,
  } = usePhotoStore(
    useShallow(state => ({
      photos: state.photos,
      isLoading: state.isLoading,
      loadError: state.loadError,
      hasMore: state.hasMore,
      fetchMorePhotos: state.fetchMorePhotos,
      toggleFavorite: state.toggleFavorite,
      deletePhoto: state.deletePhoto,
      batchDeletePhotos: state.batchDeletePhotos,
      batchMovePhotos: state.batchMovePhotos,
      categories: state.categories,
    }))
  );
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // 모달 동기화 로직
  const currentPhoto = useMemo(() => {
    if (!selectedPhoto) return null;
    return photos.find(p => p.id === selectedPhoto.id) || selectedPhoto;
  }, [photos, selectedPhoto]);

  // 배치 처리용 상태
  const [internalSelectMode, setInternalSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  const parentRef = useRef<HTMLDivElement>(null);
  const { columns, gap } = useGridBreakpoints();

  // 외부 props가 있으면 그것을 사용, 없으면 내부 상태 사용
  const isSelectMode = isExternalSelectMode !== undefined ? isExternalSelectMode : internalSelectMode;
  const setIsSelectMode = onSelectModeChange || setInternalSelectMode;

  // 카테고리에 따른 필터링 (useMemo로 최적화)
  const displayPhotos = useMemo(() => {
    if (!filterCategory) return photos;

    if (filterCategory === 'system_all') return photos;
    if (filterCategory === 'system_favorites') return photos.filter(p => p.isFavorite);
    if (filterCategory === 'system_uncategorized') return photos.filter(p => !p.category || p.category === '기타' || p.category === 'Uncategorized');

    if (filterCategory.startsWith('loc_')) {
      const targetLocation = filterCategory.replace('loc_', '');
      return photos.filter(p => p.location === targetLocation);
    }

    return photos.filter(p => p.category === filterCategory || p.tags.includes(filterCategory));
  }, [photos, filterCategory]);

  const rowCount = Math.ceil(displayPhotos.length / columns);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  const { user } = useAuthStore();
  const feedUserId = isPublicDemo ? demoUserId : user?.id;
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !feedUserId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          fetchMorePhotos(feedUserId);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, feedUserId, fetchMorePhotos]);

  const toggleSelectMode = () => {
    if (isReadOnlyDemo) return;
    setIsSelectMode(!isSelectMode);
    setSelectedIds([]);
  };

  const handlePhotoClick = (photo: Photo) => {
    if (isSelectMode) {
      setSelectedIds(prev =>
        prev.includes(photo.id) ? prev.filter(i => i !== photo.id) : [...prev, photo.id]
      );
    } else {
      setSelectedPhoto(photo);
    }
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`정말로 선택한 ${selectedIds.length}개의 사진을 삭제하시겠습니까?`)) {
      const success = await batchDeletePhotos(selectedIds);
      if (success) {
        setIsSelectMode(false);
        setSelectedIds([]);
      }
    }
  };

  const handleBatchMove = async (categoryName: string) => {
    const success = await batchMovePhotos(selectedIds, categoryName);
    if (success) {
      setIsSelectMode(false);
      setSelectedIds([]);
      setIsMoveMenuOpen(false);
    }
  };

  const handleCreateAndMove = async (name: string) => {
    if (!name.trim()) return;
    await handleBatchMove(name.trim());
    setNewAlbumName('');
  };

  return (
    <div className={cn("p-4 md:p-10 h-full overflow-y-auto custom-scrollbar relative", className)} ref={parentRef}>
      {!hideHeader && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 flex justify-between items-end"
        >
          <div>
            <h2 className="text-3xl font-light text-stone-800 mb-2">최근 추억들</h2>
            <div className="h-1 w-20 bg-[#E09F87] rounded-full opacity-60"></div>
          </div>

          <Button
            variant={isSelectMode ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSelectMode}
            className={cn("rounded-full gap-2", isSelectMode && "bg-[#E09F87] text-white hover:bg-[#D08E76]")}
          >
            {isSelectMode ? <X className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
            {isSelectMode ? "취소" : "선택"}
          </Button>
        </motion.div>
      )}

      {/* 아무 사진도 없을 때의 빈 상태 또는 로딩 상태 */}
      {displayPhotos.length === 0 ? (
        loadError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-stone-600 px-6">
            <p className="font-semibold text-lg text-stone-800">사진을 불러오지 못했습니다</p>
            <p className="text-sm mt-2 max-w-md leading-6">{loadError}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">사진을 불러오는 중입니다.</p>
            <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${gap}px` }}>
              {Array.from({ length: columns * 3 }).map((_, i) => (
                <div key={i} className="aspect-square bg-stone-200 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center text-stone-500 px-6">
            <p className="font-medium text-lg text-stone-700">이 보기에는 아직 사진이 없습니다.</p>
            <p className="text-sm mt-2">다른 앨범이나 위치를 선택해 여행 사진을 계속 둘러보세요.</p>
          </div>
        )
      ) : (
        <div
          className="relative w-full pb-24"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            return (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute top-0 left-0 w-full grid"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: `${gap}px`
                }}
              >
                {Array.from({ length: columns }).map((_, colIndex) => {
                  const photoIndex = virtualRow.index * columns + colIndex;
                  const photo = displayPhotos[photoIndex];

                  if (!photo) return <div key={`empty-${colIndex}`} />;

                  const isSelected = selectedIds.includes(photo.id);
                  const isAboveTheFold = photoIndex < columns * 2;
                  return (
                    <div
                      key={photo.id}
                      onClick={() => handlePhotoClick(photo)}
                      className={cn(
                        "group relative aspect-square overflow-hidden cursor-pointer bg-stone-100",
                        isSelected && "opacity-80"
                      )}
                    >
                      <div className={cn("w-full h-full transition-transform duration-700", !isSelectMode && "group-hover:scale-105")}>
                        <ImageWithFallback
                          src={getPhotoImageUrl(photo, "thumb")}
                          alt={photo.title}
                          className="w-full h-full object-cover"
                          loading={isAboveTheFold ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={isAboveTheFold ? "high" : "auto"}
                          width={320}
                          height={320}
                        />
                      </div>

                      {isSelected && (
                        <div className="absolute inset-0 bg-black/10 ring-4 ring-inset ring-[#E09F87] z-20 pointer-events-none" />
                      )}

                      {/* 선택 모드 체크박스 */}
                      {isSelectMode && (
                        <div
                          className={cn(
                            "absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center transition-colors z-20",
                            isSelected ? "bg-[#E09F87] border-[#E09F87] text-white" : "bg-white/50 border-white text-transparent"
                          )}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}

                      {/* 오버레이 */}
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent transition-opacity duration-300 pointer-events-none",
                        isSelectMode ? (isSelected ? "opacity-40" : "opacity-0") : "opacity-0 md:group-hover:opacity-100 opacity-100 lg:opacity-0"
                      )} />

                      {!isSelectMode && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 transition-opacity duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 pointer-events-none">
                          <p className="text-white font-semibold text-[10px] md:text-xs tracking-wide truncate drop-shadow-md">{photo.title || '제목 없는 사진'}</p>
                          <div className="mt-1 space-y-0.5">
                            <div className="flex items-center gap-1 min-w-0">
                              <MapPin className="w-2 h-2 md:w-3 md:h-3 text-[#E09F87] flex-shrink-0" />
                              <span className="text-white/90 text-[8px] md:text-[9px] uppercase tracking-wider truncate drop-shadow-sm">{photo.location || '위치 정보 없음'}</span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0 text-white/85 text-[8px] md:text-[9px] uppercase tracking-wider drop-shadow-sm">
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <Calendar className="w-2 h-2 md:w-3 md:h-3 text-white/70 flex-shrink-0" />
                                <span className="truncate">{photo.date || '날짜 없음'}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <Folder className="w-2 h-2 md:w-3 md:h-3 text-white/70 flex-shrink-0" />
                                <span className="truncate">{photo.category || photo.tags[0] || '미분류'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* 무한 스크롤 트리거 & 추가 로딩 표시 */}
          <div ref={observerTarget} className="h-20 w-full flex items-center justify-center">
            {isLoading && hasMore && (
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#E09F87] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-[#E09F87] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-[#E09F87] rounded-full animate-bounce"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 플로팅 액션 바 */}
      <AnimatePresence>
        {!isReadOnlyDemo && isSelectMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-stone-200 px-6 py-4 rounded-3xl shadow-2xl shadow-black/10"
          >
            <div className="flex items-center gap-2 mr-4 border-r border-stone-200 pr-4">
              <span className="w-8 h-8 rounded-full bg-[#E09F87] text-white flex items-center justify-center text-sm font-bold">
                {selectedIds.length}
              </span>
              <span className="text-stone-600 font-medium whitespace-nowrap">선택됨</span>
            </div>

            <div className="flex items-center gap-2 relative">
              <Button
                variant="outline"
                className="rounded-xl gap-2 text-stone-600 hover:text-[#E09F87] hover:bg-[#E09F87]/5"
                onClick={() => setIsMoveMenuOpen(!isMoveMenuOpen)}
              >
                <Move className="w-4 h-4" />
                이동
              </Button>

              <AnimatePresence>
                {isMoveMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: -80, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 min-w-[160px] flex flex-col gap-1 z-[60]"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-stone-400 px-3 py-1 font-bold">보관함 선택</p>
                    <button
                      onClick={() => handleBatchMove('Uncategorized')}
                      className="text-left px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-[#E09F87] rounded-lg transition-colors"
                    >
                      Uncategorized
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleBatchMove(cat)}
                        className="text-left px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-[#E09F87] rounded-lg transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                    <div className="border-t border-stone-100 mt-1 pt-2 px-2 pb-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="New Album..."
                        className="w-full text-xs p-1.5 border border-stone-200 rounded focus:outline-none focus:border-[#E09F87]"
                        value={newAlbumName}
                        onChange={(e) => setNewAlbumName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateAndMove(newAlbumName);
                        }}
                      />
                      <button
                        className="bg-[#E09F87] text-white px-2 rounded hover:bg-[#D08E76] text-xs font-medium"
                        onClick={() => handleCreateAndMove(newAlbumName)}
                      >
                        Add
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                variant="outline"
                className="rounded-xl gap-2 text-rose-500 hover:text-white hover:bg-rose-500 border-rose-100 hover:border-rose-500"
                onClick={handleBatchDelete}
              >
                <Trash className="w-4 h-4" />
                삭제
              </Button>
            </div>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              title="Deselect All"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PhotoModal.Root photo={currentPhoto} onClose={() => setSelectedPhoto(null)}>
        <PhotoModal.Image />
        <PhotoModal.Panel>
          <PhotoModal.Header />
          <PhotoModal.Metadata isReadOnly={isReadOnlyDemo} />
          <PhotoModal.Actions>
            <Button
              variant="outline"
              className={cn(
                "flex-1 h-12 rounded-xl border-stone-200 gap-2 transition-all",
                currentPhoto?.isFavorite
                  ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-600"
                  : "text-stone-500 hover:bg-stone-50 hover:border-stone-300"
              )}
              onClick={() => {
                if (currentPhoto) {
                  toggleFavorite(currentPhoto.id);
                }
              }}
            >
              <Heart size={18} className={currentPhoto?.isFavorite ? "fill-rose-500" : ""} />
              {currentPhoto?.isFavorite ? "좋아요 취소" : "좋아요"}
            </Button>

            {!isReadOnlyDemo && (
              <Button
                variant="outline"
                className="w-12 h-12 p-0 rounded-xl border-stone-200 text-stone-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                onClick={() => {
                  if (currentPhoto && window.confirm("이 사진을 정말로 삭제하시겠습니까?")) {
                    deletePhoto(currentPhoto.id);
                    setSelectedPhoto(null);
                  }
                }}
              >
                <Trash2 size={18} />
              </Button>
            )}
          </PhotoModal.Actions>
        </PhotoModal.Panel>
      </PhotoModal.Root>
    </div>
  );
}
