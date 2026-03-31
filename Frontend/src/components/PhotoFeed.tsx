import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, CheckCircle2, Trash, Move, X, MousePointer2 } from 'lucide-react';
import { cn } from './ui/utils';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { usePhotoContext } from '../context/PhotoContext';
import { PhotoDetailModal } from './PhotoDetailModal';
import { Button } from './ui/button';
import type { Photo } from '../type';

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
  const { photos, toggleFavorite, deletePhoto, batchDeletePhotos, batchMovePhotos, categories } = usePhotoContext();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  
  // 배치 처리용 상태
  const [internalSelectMode, setInternalSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  // 외부 props가 있으면 그것을 사용, 없으면 내부 상태 사용
  const isSelectMode = isExternalSelectMode !== undefined ? isExternalSelectMode : internalSelectMode;
  const setIsSelectMode = onSelectModeChange || setInternalSelectMode;

  // 카테고리에 따른 필터링 (useMemo로 최적화)
  const displayPhotos = useMemo(() => {
    if (!filterCategory) return photos;
    
    if (filterCategory === 'system_all') return photos;
    if (filterCategory === 'system_favorites') return photos.filter(p => p.isFavorite);
    if (filterCategory === 'system_uncategorized') return photos.filter(p => !p.category || p.category === '기타' || p.category === 'Uncategorized');
    
    return photos.filter(p => p.category === filterCategory || p.tags.includes(filterCategory));
  }, [photos, filterCategory]);

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
    <div className={cn("p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative", className)}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          {displayPhotos.map((photo, index) => {
            const isSelected = selectedIds.includes(photo.id);
            return (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                onClick={() => handlePhotoClick(photo)}
                className={cn(
                  "group relative aspect-[4/5] overflow-hidden rounded-2xl cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 bg-stone-100",
                  isSelected && "ring-4 ring-[#E09F87] ring-offset-2"
                )}
              >
                <div className={cn("w-full h-full transition-transform duration-700", !isSelectMode && "group-hover:scale-105")}>
                  <ImageWithFallback
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 선택 모드 체크박스 커스텀 UI */}
                {isSelectMode && (
                  <div 
                    className={cn(
                      "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-10",
                      isSelected ? "bg-[#E09F87] border-[#E09F87] text-white" : "bg-white/50 border-white text-transparent"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}

                {/* 오버레이 */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-opacity duration-300",
                  isSelectMode ? (isSelected ? "opacity-40" : "opacity-0") : "opacity-0 group-hover:opacity-100"
                )} />

                {!isSelectMode && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                    <p className="text-white font-medium text-lg tracking-wide">{photo.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-[#E09F87]" />
                      <span className="text-white/80 text-xs uppercase tracking-wider line-clamp-1">{photo.location}</span>
                    </div>
                    <p className="text-white/60 text-[10px] mt-2 font-mono">{photo.date}</p>
                  </div>
                )}
              </motion.div>
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

      <PhotoDetailModal 
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onToggleFavorite={(id) => {
          toggleFavorite(id);
          setSelectedPhoto(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
        }}
        onDelete={deletePhoto}
      />
    </div>
  );
}

