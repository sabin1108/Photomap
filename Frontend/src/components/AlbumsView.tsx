import { useState, useMemo } from 'react';
import { Plus, Pencil, Heart, Image as ImageIcon, ArchiveX, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { usePhotoContext } from '../context/PhotoContext';
import { PhotoFeed } from './PhotoFeed'; // 앨범 상세 진입 시 재사용

interface Album {
  id: string;
  title: string;
  cover: string;
  count: number;
  date: string;
  theme: 'dark' | 'light' | 'sepia';
  icon?: any; // 시스템 앨범용 아이콘 컴포넌트
}

export function AlbumsView() {
  const { categories, photos, addCategory, updateCategory, deleteCategory } = usePhotoContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '' });
  
  // 편집(수정/삭제) 모달용 상태
  const [editingAlbumName, setEditingAlbumName] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '' });
  
  // 현재 보고있는 앨범 ID (null 이면 전체 앨범 목록 화면)
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);

  // 1. 기본 시스템 고정 앨범 3개
  const systemAlbums: Album[] = useMemo(() => {
    // 1-1. All Photos
    const allCount = photos.length;
    const allCover = allCount > 0 ? photos[0].url : '';
    const allDate = allCount > 0 ? photos[0].date : 'Empty';

    // 1-2. Favorites
    const favPhotos = photos.filter(p => p.isFavorite);
    const favCount = favPhotos.length;
    const favCover = favCount > 0 ? favPhotos[0].url : '';
    const favDate = favCount > 0 ? favPhotos[0].date : 'Empty';

    // 1-3. Uncategorized (category가 없거나 '기타'로 매핑된 경우)
    const uncatPhotos = photos.filter(p => !p.category || p.category === '기타');
    const uncatCount = uncatPhotos.length;
    const uncatCover = uncatCount > 0 ? uncatPhotos[0].url : '';
    const uncatDate = uncatCount > 0 ? uncatPhotos[0].date : 'Empty';

    return [
      { id: 'system_all', title: 'All Photos', cover: allCover, count: allCount, date: allDate, theme: 'light', icon: ImageIcon },
      { id: 'system_favorites', title: 'Favorites', cover: favCover, count: favCount, date: favDate, theme: 'light', icon: Heart },
      { id: 'system_uncategorized', title: 'Uncategorized', cover: uncatCover, count: uncatCount, date: uncatDate, theme: 'light', icon: ArchiveX }
    ];
  }, [photos]);

  // 2. 사용자가 만든 커스텀 앨범 목록
  const customAlbums: Album[] = useMemo(() => {
    return categories.map(category => {
      // 카테고리 이름으로 매칭되는 사진들 찾기
      const categoryPhotos = photos.filter(p => p.category === category || p.tags.includes(category));

      const coverPhoto = categoryPhotos.length > 0 ? categoryPhotos[0].url : '';
      const date = categoryPhotos.length > 0 ? categoryPhotos[0].date : 'New';

      return {
        id: category, // DB 카테고리 이름을 id로 사용
        title: category.charAt(0).toUpperCase() + category.slice(1),
        cover: coverPhoto,
        count: categoryPhotos.length,
        date: date,
        theme: 'light'
      };
    });
  }, [categories, photos]);

  const allAlbums = [...systemAlbums, ...customAlbums];

  const handleOpenCreate = () => {
    setFormData({ title: '' });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (formData.title.trim()) {
      addCategory(formData.title.trim());
      setIsDialogOpen(false);
    }
  };

  const handleUpdateAlbum = async () => {
    if (editingAlbumName && editFormData.title.trim() && editingAlbumName !== editFormData.title.trim()) {
      const success = await updateCategory(editingAlbumName, editFormData.title.trim());
      if (success) {
        setEditingAlbumName(null);
      }
    } else {
        setEditingAlbumName(null);
    }
  };

  const handleDeleteAlbum = async () => {
    if (editingAlbumName) {
      if (window.confirm(`Are you sure you want to delete "${editingAlbumName}"?\nPhotos inside will NOT be deleted, but moved to Uncategorized.`)) {
        const success = await deleteCategory(editingAlbumName);
        if (success) {
          setEditingAlbumName(null);
        }
      }
    }
  };

  // --- 앨범 내부 진입 뷰 구성 ---
  if (activeAlbum) {
    // 렌더링 할 헤더 타이틀 찾기
    const albumInfo = allAlbums.find(a => a.id === activeAlbum);

    return (
      <div className="w-full h-full bg-[#F5F2EB] flex flex-col relative overflow-hidden">
        {/* 뒤로가기 및 앨범 헤더 */}
        <div className="flex-none px-6 pt-16 pb-4 md:px-10 md:pt-12 flex items-center gap-4 z-10 border-b border-stone-200/50">
          <button 
            onClick={() => setActiveAlbum(null)}
            className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-stone-600 hover:bg-white transition-colors border border-stone-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-medium text-stone-800 flex items-center gap-2">
              {albumInfo?.icon && <albumInfo.icon className="w-5 h-5 text-[#E09F87]" />}
              {albumInfo?.title || activeAlbum}
            </h2>
            <p className="text-stone-500 text-sm">{albumInfo?.count} photos</p>
          </div>
        </div>
        
        {/* 재사용한 피드 컴포넌트 렌더링. filterCategory prop으로 필터링 지시 */}
        <div className="flex-1 overflow-hidden">
          <PhotoFeed className="pt-6 h-full p-4 md:p-10" filterCategory={activeAlbum} hideHeader={true} />
        </div>
      </div>
    );
  }

  // --- 기존 앨범 목록 그리드 뷰 구성 ---
  return (
    <div className="w-full h-full bg-[#F5F2EB] flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 pt-16 pb-6 md:px-10 md:py-8 flex items-end justify-between z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-stone-800 tracking-tight">
            Curated <span className="font-serif italic text-[#E09F87]">Albums</span>
          </h1>
          <p className="text-stone-500 mt-2 text-sm md:text-base">
            Organized collections of your journeys.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#E09F87] hover:bg-[#D08E76] text-white rounded-full shadow-lg gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">Create Album</span>
        </Button>
      </div>

      {/* Albums Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {allAlbums.map((album) => (
            <div key={album.id} className="group cursor-pointer" onClick={() => setActiveAlbum(album.id)}>
              {/* Album Cover Stack Effect */}
              <div className="relative aspect-[4/5] mb-4">
                <div className="absolute inset-0 bg-stone-200 rounded-2xl transform rotate-3 translate-x-2 translate-y-1 opacity-60 transition-transform group-hover:rotate-6 group-hover:translate-x-3" />
                <div className="absolute inset-0 bg-stone-300 rounded-2xl transform -rotate-2 -translate-x-1 translate-y-1 opacity-60 transition-transform group-hover:-rotate-4 group-hover:-translate-x-2" />

                <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-sm border border-white/20 bg-stone-100 flex items-center justify-center group-hover:shadow-xl transition-all">
                  {album.cover ? (
                    <>
                      <ImageWithFallback
                        src={album.cover}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-stone-300 gap-2">
                       {album.icon ? <album.icon className="w-8 h-8 opacity-40" /> : (
                          <div className="w-12 h-12 rounded-full bg-stone-200/50 flex items-center justify-center">
                            <Plus className="w-5 h-5 opacity-50" />
                          </div>
                       )}
                      <span className="text-xs font-medium">Empty</span>
                    </div>
                  )}

                  {/* Icon for System Albums overlay */}
                  {album.icon && album.cover && (
                    <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-sm">
                      <album.icon className="w-4 h-4" />
                    </div>
                  )}

                  {/* Overlay Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex justify-between items-center text-white">
                      <span className="text-xs font-medium bg-white/20 backdrop-blur-md px-2 py-1 rounded-md border border-white/20">
                        {album.count} photos
                      </span>
                      {/* 시스템 앨범이 아닌 커스텀 앨범일때만 펜슬, 쉐어 버튼 노출 */}
                      {!album.id.startsWith('system_') && (
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setEditingAlbumName(album.id);
                              setEditFormData({ title: album.title });
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Album Meta */}
              <div className="px-1">
                <h3 className="font-medium text-lg text-stone-800 group-hover:text-[#E09F87] transition-colors line-clamp-1">
                  {album.title}
                </h3>
                <p className="text-sm text-stone-500 mt-0.5">{album.date}</p>
              </div>
            </div>
          ))}

          {/* Add New Album Placeholder */}
          <button
            onClick={handleOpenCreate}
            className="aspect-[4/5] rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#E09F87] hover:bg-[#E09F87]/5 transition-all flex flex-col items-center justify-center gap-3 group text-stone-400 hover:text-[#E09F87]"
          >
            <div className="w-12 h-12 rounded-full bg-stone-100 group-hover:bg-[#E09F87]/10 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-medium">New Collection</span>
          </button>
        </div>
        <div className="h-20" />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Album</DialogTitle>
            <DialogDescription>
              Add a new category/folder to your collection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Name
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="col-span-3"
                placeholder="Folder Name (e.g. Travel)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSave} className="bg-[#E09F87] hover:bg-[#D08E76] text-white">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Delete Album Dialog */}
      <Dialog open={!!editingAlbumName} onOpenChange={(open: boolean) => !open && setEditingAlbumName(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Album</DialogTitle>
            <DialogDescription>
              Rename your album or delete it completely.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                Name
              </Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-between w-full sm:justify-between items-center gap-2">
            <Button 
                variant="destructive" 
                onClick={handleDeleteAlbum}
                className="mr-auto"
             >
                Delete Album
            </Button>
            <Button onClick={handleUpdateAlbum} className="bg-[#E09F87] hover:bg-[#D08E76] text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
