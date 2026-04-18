import { useState, useMemo, useRef } from 'react';
import { Plus, Pencil, ArrowLeft, MousePointer2, X, CheckCircle2, Trash, FolderPlus, MapPin, Heart, Image as ImageIcon, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { usePhotoStore } from '../store/usePhotoStore';
import { PhotoFeed } from './PhotoFeed';
import { UploadScreen } from './UploadScreen';
import { cn } from './ui/utils';
import { useGridBreakpoints } from '../hooks/useGridBreakpoints';
export interface Album {
  id: string;
  title: string;
  cover: string;
  count: number;
  date: string;
  theme: 'light' | 'dark';
  icon?: any;
  isLocation?: boolean;
}

export function AlbumsView() {
  // 상태 관리
  const categories = usePhotoStore(state => state.categories);
  const photos = usePhotoStore(state => state.photos);
  const addCategory = usePhotoStore(state => state.addCategory);
  const updateCategory = usePhotoStore(state => state.updateCategory);
  const deleteCategory = usePhotoStore(state => state.deleteCategory);
  const batchDeleteCategories = usePhotoStore(state => state.batchDeleteCategories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '' });

  const [editingAlbumName, setEditingAlbumName] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '' });

  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'places' | 'collections'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedAlbumNames, setSelectedAlbumNames] = useState<string[]>([]);
  const [isPhotoSelectMode, setIsPhotoSelectMode] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // 그리드 설정
  const parentRef = useRef<HTMLDivElement>(null);
  const { columns, gap } = useGridBreakpoints();

  // 시스템 앨범 생성
  const systemAlbums: Album[] = useMemo(() => {
    const favPhotos = photos.filter(p => p.isFavorite);
    return [
      { id: 'system_all', title: 'All Photos', cover: photos[0]?.url || '', count: photos.length, date: photos[0]?.date || 'Empty', theme: 'light', icon: ImageIcon },
      { id: 'system_favorites', title: 'Favorites', cover: favPhotos[0]?.url || '', count: favPhotos.length, date: favPhotos[0]?.date || 'Empty', theme: 'light', icon: Heart }
    ];
  }, [photos]);

  // 장소 앨범 생성
  const placeAlbums: Album[] = useMemo(() => {
    const locations = Array.from(new Set(photos.map(p => p.location).filter(Boolean)));
    return locations.map((loc): Album => {
      const locPhotos = photos.filter(p => p.location === loc);
      const sortedPhotos = [...locPhotos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        id: `loc_${loc}`, title: loc as string, cover: sortedPhotos[0]?.url || '', count: locPhotos.length, date: sortedPhotos[0]?.date || 'New', theme: 'light', icon: MapPin, isLocation: true
      };
    }).sort((a, b) => b.count - a.count);
  }, [photos]);

  // 커스텀 앨범 생성
  const customAlbums: Album[] = useMemo(() => {
    return categories.map(category => {
      const categoryPhotos = photos.filter(p => p.category === category || p.tags.includes(category));
      const sortedPhotos = [...categoryPhotos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        id: category, title: category.charAt(0).toUpperCase() + category.slice(1), cover: sortedPhotos[0]?.url || '', count: categoryPhotos.length, date: sortedPhotos[0]?.date || 'New', theme: 'light'
      };
    });
  }, [categories, photos]);

  // 카테고리별 필터 적용
  const categorizedAlbums = useMemo(() => {
    const filterFn = (a: Album) => {
      const isNotEmpty = a.count > 0;
      const matchesSearch = searchQuery.trim()
        ? a.title.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return isNotEmpty && matchesSearch;
    };

    return {
      system: systemAlbums.filter(filterFn),
      places: placeAlbums.filter(filterFn),
      collections: customAlbums.filter(filterFn)
    };
  }, [systemAlbums, placeAlbums, customAlbums, searchQuery]);

  // 탭 필터링 어레이
  const filteredAlbums = useMemo(() => {
    if (activeTab === 'system') return categorizedAlbums.system;
    if (activeTab === 'places') return categorizedAlbums.places;
    if (activeTab === 'collections') return categorizedAlbums.collections;

    return [
      ...categorizedAlbums.system,
      ...categorizedAlbums.places,
      ...categorizedAlbums.collections
    ];
  }, [activeTab, categorizedAlbums]);

  // 핸들러 모음
  const handleOpenCreate = () => { setFormData({ title: '' }); setIsDialogOpen(true); };
  const handleSave = () => { if (formData.title.trim()) { addCategory(formData.title.trim()); setIsDialogOpen(false); } };
  const handleUpdateAlbum = async () => { if (editingAlbumName && editFormData.title.trim()) { await updateCategory(editingAlbumName, editFormData.title.trim()); setEditingAlbumName(null); } };
  const handleDeleteAlbum = async () => { if (editingAlbumName) { if (window.confirm('이 컬렉션을 삭제하시겠습니까?')) { await deleteCategory(editingAlbumName); setEditingAlbumName(null); } } };

  // 클릭 이벤트
  const handleAlbumClick = (albumId: string) => {
    if (isSelectMode) {
      if (albumId.startsWith('system_') || albumId.startsWith('loc_')) return;
      setSelectedAlbumNames(prev => prev.includes(albumId) ? prev.filter(n => n !== albumId) : [...prev, albumId]);
    } else {
      setActiveAlbum(albumId);
    }
  };

  // 일괄 삭제
  const handleBatchDeleteAlbums = async () => { if (selectedAlbumNames.length > 0 && window.confirm('선택한 항목들을 삭제하시겠습니까?')) { await batchDeleteCategories(selectedAlbumNames); setIsSelectMode(false); setSelectedAlbumNames([]); } };

  // 활성화 앨범 렌더링
  if (activeAlbum) {
    const albumInfo = [...systemAlbums, ...placeAlbums, ...customAlbums].find(a => a.id === activeAlbum);
    return (
      <div className="w-full h-full bg-[#F5F2EB] flex flex-col relative overflow-hidden">
        <div className="flex-none px-4 pt-14 pb-4 md:px-10 md:pt-12 flex items-center justify-between z-10 border-b border-stone-200/50 bg-[#F5F2EB]/90 backdrop-blur-md">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setActiveAlbum(null)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-600 shadow-sm border border-stone-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl md:text-2xl font-semibold text-stone-800 flex items-center gap-2 truncate max-w-[150px] md:max-w-none">
              {albumInfo?.title || activeAlbum}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isPhotoSelectMode && (
              <Button className="bg-[#E09F87] hover:bg-[#D08E76] text-white rounded-full shadow-md gap-2 h-9 px-3 md:h-10 md:px-4" onClick={() => setIsUploadOpen(true)}>
                <Plus className="w-4 h-4" /> <span className="hidden md:inline">Upload Here</span>
              </Button>
            )}
            <Button variant={isPhotoSelectMode ? "secondary" : "outline"} size="sm" onClick={() => setIsPhotoSelectMode(!isPhotoSelectMode)} className="rounded-full gap-2 border-stone-200 h-9 px-3 md:h-10 md:px-4">
              {isPhotoSelectMode ? <X className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
              <span className="hidden md:inline">{isPhotoSelectMode ? "Cancel" : "Select"}</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <PhotoFeed className="h-full p-2 md:p-6" filterCategory={activeAlbum} hideHeader={true} isExternalSelectMode={isPhotoSelectMode} onSelectModeChange={setIsPhotoSelectMode} />
        </div>

        {isUploadOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center md:p-10 bg-black/20 backdrop-blur-sm">
            <div className="w-full h-full md:w-[480px] md:h-[800px] md:rounded-[40px] overflow-hidden shadow-2xl relative">
              <UploadScreen onClose={() => setIsUploadOpen(false)} initialLocation={activeAlbum.startsWith('loc_') ? activeAlbum.replace('loc_', '') : undefined} initialCategory={!activeAlbum.startsWith('loc_') && !activeAlbum.startsWith('system_') ? activeAlbum : undefined} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#F5F2EB] flex flex-col relative overflow-hidden font-sans selection:bg-[#E09F87] selection:text-white pb-24">

      {/* 헤더 (탭/검색) */}
      <div className="flex-none pt-12 md:pt-16 pb-4 px-4 md:px-8 border-b border-stone-200/50 z-10 bg-[#F5F2EB]/90 backdrop-blur-xl shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-center justify-between md:justify-start gap-4">
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Albums
            </h1>
            <Button variant="outline" onClick={handleOpenCreate} className="rounded-full shadow-sm border-stone-200 h-9 px-3 text-stone-600 gap-1.5 md:hidden">
              <FolderPlus className="w-4 h-4" /> New
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
            {/* 검색바 */}
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </div>
              <Input
                placeholder="Search albums..."
                className="block w-full pl-10 bg-white/50 border-white/50 shadow-sm rounded-2xl h-10 text-stone-800 placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-[#E09F87]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="hidden md:flex gap-2">
              <Button onClick={handleOpenCreate} className="bg-stone-900 hover:bg-stone-800 text-white rounded-2xl shadow-sm gap-1.5 font-medium h-10">
                <FolderPlus className="w-4 h-4" /> New
              </Button>
              <Button variant="outline" onClick={() => { setIsSelectMode(!isSelectMode); setSelectedAlbumNames([]); }} className={cn("rounded-2xl gap-2 border-stone-200 bg-white h-10", isSelectMode && "bg-[#E09F87] border-[#E09F87] text-white")}>
                {isSelectMode ? <X className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />} Select
              </Button>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-1 overflow-x-auto mt-4 md:mt-6 pb-1 [&::-webkit-scrollbar]:hidden snap-x">
          {(['all', 'system', 'places', 'collections'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 md:px-5 py-2 rounded-full text-sm font-medium transition-all snap-start whitespace-nowrap",
                activeTab === tab
                  ? "bg-[#E09F87] text-white shadow-sm"
                  : "text-stone-500 hover:bg-stone-200/50"
              )}
            >
              {tab === 'all' ? '전체 보기' : tab === 'system' ? '시스템' : tab === 'places' ? '위치 정보' : '태그 정보'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 md:px-4 py-2 md:py-4 [&::-webkit-scrollbar]:hidden bg-transparent" ref={parentRef}>
        {activeTab === 'all' ? (
          <div className="space-y-12 pb-24">
            {/* 위치 섹션 */}
            {categorizedAlbums.places.length > 0 && (
              <section>
                <h2 className="px-2 mb-4 text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#E09F87] rounded-full" /> 위치 정보
                </h2>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${gap}px` }}>
                  {categorizedAlbums.places.map(album => (
                    <AlbumItem key={album.id} album={album} isSelectMode={isSelectMode} isSelected={selectedAlbumNames.includes(album.id)} onClick={() => handleAlbumClick(album.id)} onEdit={() => { setEditingAlbumName(album.id); setEditFormData({ title: album.title }); }} />
                  ))}
                </div>
              </section>
            )}

            {/* 구분선 */}
            {categorizedAlbums.places.length > 0 && categorizedAlbums.collections.length > 0 && (
              <div className="px-2">
                <div className="h-px bg-stone-200/50 w-full" />
              </div>
            )}

            {/* 태그 섹션 */}
            {categorizedAlbums.collections.length > 0 && (
              <section>
                <h2 className="px-2 mb-4 text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#E09F87] rounded-full" /> 태그 보관함
                </h2>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${gap}px` }}>
                  {categorizedAlbums.collections.map(album => (
                    <AlbumItem key={album.id} album={album} isSelectMode={isSelectMode} isSelected={selectedAlbumNames.includes(album.id)} onClick={() => handleAlbumClick(album.id)} onEdit={() => { setEditingAlbumName(album.id); setEditFormData({ title: album.title }); }} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="pb-24">
            {filteredAlbums.length === 0 ? (
              <div className="w-full h-40 flex flex-col items-center justify-center text-stone-400 gap-2">
                <Search className="w-8 h-8 opacity-20" />
                <p>No albums found</p>
              </div>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${gap}px` }}>
                {filteredAlbums.map(album => (
                  <AlbumItem key={album.id} album={album} isSelectMode={isSelectMode} isSelected={selectedAlbumNames.includes(album.id)} onClick={() => handleAlbumClick(album.id)} onEdit={() => { setEditingAlbumName(album.id); setEditFormData({ title: album.title }); }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하위 컴포넌트: 앨범 아이템 */}
      {/* (내부 함수 형태로 선언하여 사용하거나 외부에 분리) */}

      {/* 배치 작업 컨트롤 */}
      <AnimatePresence>
        {isSelectMode && selectedAlbumNames.length > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-stone-900/95 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-full shadow-2xl text-white">
            <span className="font-medium text-sm">{selectedAlbumNames.length} selected</span>
            <Button variant="destructive" className="rounded-full gap-2 px-6 shadow-sm" onClick={handleBatchDeleteAlbums}>
              <Trash className="w-4 h-4" /> Delete
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모달 영역 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-[2rem] border-stone-200 bg-[#F5F2EB]">
          <DialogTitle>New Collection</DialogTitle>
          <Input placeholder="Album Title" value={formData.title} onChange={(e) => setFormData({ title: e.target.value })} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="bg-white border-stone-200 focus:border-[#E09F87] rounded-xl py-6 text-lg shadow-sm" />
          <Button onClick={handleSave} className="w-full rounded-xl bg-[#E09F87] hover:bg-[#D08E76] text-white text-lg h-12 mt-2 shadow-sm">Create</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAlbumName} onOpenChange={(open: boolean) => !open && setEditingAlbumName(null)}>
        <DialogContent className="sm:max-w-sm rounded-[2rem] border-stone-200 bg-[#F5F2EB]">
          <DialogTitle>Rename Collection</DialogTitle>
          <Input value={editFormData.title} onChange={(e) => setEditFormData({ title: e.target.value })} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUpdateAlbum()} className="bg-white border-stone-200 focus:border-[#E09F87] rounded-xl py-6 text-lg shadow-sm" />
          <div className="flex gap-3 w-full mt-2">
            <Button onClick={handleUpdateAlbum} className="flex-1 bg-[#E09F87] text-white hover:bg-[#D08E76] rounded-xl text-lg h-12 shadow-sm">Save</Button>
            <Button variant="outline" onClick={handleDeleteAlbum} className="flex-1 border-rose-200 text-rose-500 bg-white hover:bg-rose-50 rounded-xl text-lg h-12">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 아이템 컴포넌트
function AlbumItem({ album, isSelectMode, isSelected, onClick, onEdit }: { 
  album: Album, 
  isSelectMode: boolean, 
  isSelected: boolean, 
  onClick: () => void, 
  onEdit: () => void 
}) {
  const isSystem = album.id.startsWith('system_');
  const isLocation = album.id.startsWith('loc_');

  return (
    <div
      key={album.id}
      className={cn(
        "aspect-square relative group cursor-pointer overflow-hidden bg-white rounded-2xl shadow-sm border border-stone-100",
        isSelectMode && (isSystem || isLocation) && "opacity-40 cursor-not-allowed grayscale"
      )}
      onClick={onClick}
    >
      {album.cover ? (
        <ImageWithFallback
          src={album.cover}
          className={cn(
            "w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105",
            isSelected && "scale-90 rounded-xl"
          )}
        />
      ) : (
        <div className="w-full h-full bg-stone-50 flex flex-col items-center justify-center">
          {album.icon ? <album.icon className="w-6 h-6 md:w-8 md:h-8 text-stone-200" /> : <FolderPlus className="w-6 h-6 md:w-8 md:h-8 text-stone-200" />}
        </div>
      )}

      {isSelected && (
        <div className="absolute inset-0 bg-black/10 ring-4 ring-inset ring-[#E09F87] z-20 pointer-events-none rounded-2xl" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-2 md:p-3">
        <h3 className="text-white text-xs md:text-[13px] font-semibold truncate tracking-tight drop-shadow-md leading-tight">{album.title}</h3>
        <p className="text-white/80 text-[10px] font-medium hidden md:block mt-0.5">{album.count} items</p>
      </div>

      {isSelectMode && !isSystem && !isLocation && (
        <div className={cn(
          "absolute top-2 left-2 w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-colors z-20",
          isSelected ? "bg-[#E09F87] border-[#E09F87] text-white" : "bg-white/20 backdrop-blur-md border-white/80 text-transparent"
        )}>
          <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
        </div>
      )}

      {!isSelectMode && !isSystem && !isLocation && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-7 w-7 md:h-8 md:w-8 text-white bg-black/40 backdrop-blur-md rounded-full opacity-0 lg:group-hover:opacity-100 transition-opacity z-20 hover:bg-black/80"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="w-3 h-3 md:w-4 md:h-4" />
        </Button>
      )}
    </div>
  );
}
