import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, CheckCircle2, Trash, Trash2, Move, X, MousePointer2, Heart } from 'lucide-react';
import { cn } from './ui/utils';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { usePhotoStore } from '../store/usePhotoStore';
import { PhotoModal } from './ui/photo-modal';
import { Button } from './ui/button';
import type { Photo } from '../type';
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useGridBreakpoints } from '../hooks/useGridBreakpoints';

interface PhotoFeedProps {
  className?: string;
  filterCategory?: string | null;
  hideHeader?: boolean;
  // 외부에서 선택 모드를 제어하기 위한 props
  isExternalSelectMode?: boolean;
  onSelectModeChange?: (isSelect: boolean) => void;
}

export function PhotoFeed({ 
  className, 
  filterCategory, 
  hideHeader,
  isExternalSelectMode,
  onSelectModeChange
}: PhotoFeedProps) {
  const photos = usePhotoStore(state => state.photos);
  const toggleFavorite = usePhotoStore(state => state.toggleFavorite);
  const deletePhoto = usePhotoStore(state => state.deletePhoto);
  const batchDeletePhotos = usePhotoStore(state => state.batchDeletePhotos);
  const batchMovePhotos = usePhotoStore(state => state.batchMovePhotos);
  const categories = usePhotoStore(state => state.categories);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  
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
    estimateSize: () => 150, // rough estimate of row height, auto-adjusts
    overscan: 3, 
  });

  const toggleSelectMode = () => {
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
            <h2 className="text-3xl font-light text-stone-800 mb-2">Recent Memories</h2>
            <div className="h-1 w-20 bg-[#E09F87] rounded-full opacity-60"></div>
          </div>
          
          <Button
            variant={isSelectMode ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSelectMode}
            className={cn("rounded-full gap-2", isSelectMode && "bg-[#E09F87] text-white hover:bg-[#D08E76]")}
          >
            {isSelectMode ? <X className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
            {isSelectMode ? "Cancel" : "Select"}
          </Button>
        </motion.div>
      )}

      {/* 아무 사진도 없을 때의 빈 상태 표출 */}
      {displayPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-stone-400">
          <p className="font-medium text-lg">No photos found here.</p>
          <p className="text-sm">Try uploading some photos to this album!</p>
        </div>
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
                          src={photo.url}
                          alt={photo.title}
                          className="w-full h-full object-cover"
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
                          <p className="text-white font-semibold text-[10px] md:text-xs tracking-wide truncate drop-shadow-md">{photo.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2 h-2 md:w-3 md:h-3 text-[#E09F87]" />
                            <span className="text-white/90 text-[8px] md:text-[9px] uppercase tracking-wider truncate drop-shadow-sm">{photo.location}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar */}
      <AnimatePresence>
        {isSelectMode && selectedIds.length > 0 && (
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
              <span className="text-stone-600 font-medium whitespace-nowrap">Selected</span>
            </div>

            <div className="flex items-center gap-2 relative">
              <Button
                variant="outline"
                className="rounded-xl gap-2 text-stone-600 hover:text-[#E09F87] hover:bg-[#E09F87]/5"
                onClick={() => setIsMoveMenuOpen(!isMoveMenuOpen)}
              >
                <Move className="w-4 h-4" />
                Move
              </Button>

              <AnimatePresence>
                {isMoveMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: -80, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 min-w-[160px] flex flex-col gap-1 z-[60]"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-stone-400 px-3 py-1 font-bold">Select Album</p>
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
                Delete
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

      <PhotoModal.Root photo={selectedPhoto} onClose={() => setSelectedPhoto(null)}>
        <PhotoModal.Image />
        <PhotoModal.Panel>
          <PhotoModal.Header />
          <PhotoModal.Metadata />
          <PhotoModal.Actions>
            <Button
              variant="outline"
              className={cn(
                "flex-1 h-12 rounded-xl border-stone-200 gap-2 transition-all",
                selectedPhoto?.isFavorite
                  ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-600"
                  : "text-stone-500 hover:bg-stone-50 hover:border-stone-300"
              )}
              onClick={() => {
                if (selectedPhoto) {
                  toggleFavorite(selectedPhoto.id);
                  setSelectedPhoto(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
                }
              }}
            >
              <Heart size={18} className={selectedPhoto?.isFavorite ? "fill-rose-500" : ""} />
              {selectedPhoto?.isFavorite ? "Favorited" : "Favorite"}
            </Button>

            <Button
              variant="outline"
              className="w-12 h-12 p-0 rounded-xl border-stone-200 text-stone-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
              onClick={() => {
                if (selectedPhoto && window.confirm("Are you sure you want to delete this photo?")) {
                  deletePhoto(selectedPhoto.id);
                  setSelectedPhoto(null);
                }
              }}
            >
              <Trash2 size={18} />
            </Button>
          </PhotoModal.Actions>
        </PhotoModal.Panel>
      </PhotoModal.Root>
    </div>
  );
}

