import { useState, useMemo } from 'react';
import { Plus, Pencil, Heart, Image as ImageIcon, ArrowLeft, MousePointer2, X, CheckCircle2, Trash, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import { PhotoFeed } from './PhotoFeed';
import { cn } from './ui/utils';

interface Album {
  id: string;
  title: string;
  cover: string;
  count: number;
  date: string;
  theme: 'dark' | 'light' | 'sepia';
  icon?: any;
}

export function AlbumsView() {
  const { categories, photos, addCategory, updateCategory, deleteCategory, batchDeleteCategories } = usePhotoContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '' });

  const [editingAlbumName, setEditingAlbumName] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '' });

  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);

  // ??�쾾 洹몃????좏깮 紐⑤�??곹깭
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedAlbumNames, setSelectedAlbumNames] = useState<string[]>([]);

  // ??�쾾 ?곸꽭 ?�곗�??�쓽 ??�??좏깮 紐⑤�??곹깭
  const [isPhotoSelectMode, setIsPhotoSelectMode] = useState(false);

  const systemAlbums: Album[] = useMemo(() => {
    const allCount = photos.length;
    const allCover = allCount > 0 ? photos[0].url : '';
    const allDate = allCount > 0 ? photos[0].date : 'Empty';

    const favPhotos = photos.filter(p => p.isFavorite);
    const favCount = favPhotos.length;
    const favCover = favCount > 0 ? favPhotos[0].url : '';
    const favDate = favCount > 0 ? favPhotos[0].date : 'Empty';

    return [
      { id: 'system_all', title: 'All Photos', cover: allCover, count: allCount, date: allDate, theme: 'light', icon: ImageIcon },
      { id: 'system_favorites', title: 'Favorites', cover: favCover, count: favCount, date: favDate, theme: 'light', icon: Heart }
    ];
  }, [photos]);

  const customAlbums: Album[] = useMemo(() => {
    return categories.map(category => {
      const categoryPhotos = photos.filter(p => p.category === category || p.tags.includes(category));
      const coverPhoto = categoryPhotos.length > 0 ? categoryPhotos[0].url : '';
      const date = categoryPhotos.length > 0 ? categoryPhotos[0].date : 'New';

      return {
        id: category,
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

  const handleAlbumClick = (albumId: string) => {
    if (isSelectMode) {
      if (albumId.startsWith('system_')) return; // ??�뒪????�쾾?? ?좏깮 ?�덇?
      setSelectedAlbumNames(prev => 
        prev.includes(albumId) ? prev.filter(name => name !== albumId) : [...prev, albumId]
      );
    } else {
      setActiveAlbum(albumId);
    }
  };

  const handleBatchDeleteAlbums = async () => {
    if (window.confirm(`?뺣쭚�??좏깮??${selectedAlbumNames.length}媛쒖????�쾾???????�떆寃좎???�퉴?\n??�쾾 ????�?? ?????? ??�뒿??�떎.`)) {
      const success = await batchDeleteCategories(selectedAlbumNames);
      if (success) {
        setIsSelectMode(false);
        setSelectedAlbumNames([]);
      }
    }
  };

  if (activeAlbum) {
    const albumInfo = allAlbums.find(a => a.id === activeAlbum);

    return (
      <div className="w-full h-full bg-[#F5F2EB] flex flex-col relative overflow-hidden">
        <div className="flex-none px-6 pt-16 pb-4 md:px-10 md:pt-12 flex items-center justify-between z-10 border-b border-stone-200/50">
          <div className="flex items-center gap-4">
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isPhotoSelectMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsPhotoSelectMode(!isPhotoSelectMode)}
              className={cn("rounded-full gap-2", isPhotoSelectMode && "bg-[#E09F87] text-white hover:bg-[#D08E76]")}
            >
              {isPhotoSelectMode ? <X className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
              {isPhotoSelectMode ? "Cancel" : "Select"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <PhotoFeed
            className="pt-6 h-full p-4 md:p-10"
            filterCategory={activeAlbum}
            hideHeader={true}
            isExternalSelectMode={isPhotoSelectMode}
            onSelectModeChange={setIsPhotoSelectMode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#F5F2EB] flex flex-col relative overflow-hidden">
      <div className="flex-none px-6 pt-16 pb-6 md:px-10 md:py-8 flex flex-col md:flex-row md:items-end justify-between z-10 gap-4 md:gap-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-stone-800 tracking-tight">
            Curated <span className="font-serif italic text-[#E09F87]">Albums</span>
          </h1>
          <p className="text-stone-500 mt-2 text-sm md:text-base">
            Organized collections of your journeys.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={isSelectMode ? "secondary" : "outline"}
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedAlbumNames([]);
            }}
            className={cn("rounded-full gap-2", isSelectMode && "bg-[#E09F87] text-white hover:bg-[#D08E76]")}
          >
            {isSelectMode ? <X className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
            {isSelectMode ? "Cancel" : "Select"}
          </Button>
          {!isSelectMode && (
            <Button
              onClick={handleOpenCreate}
              className="bg-[#E09F87] hover:bg-[#D08E76] text-white rounded-full shadow-lg gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Create Album</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {allAlbums.map((album) => {
            const isSelected = selectedAlbumNames.includes(album.id);
            const isSystem = album.id.startsWith('system_');
            
            return (
              <div 
                key={album.id} 
                className={cn(
                  "group relative cursor-pointer",
                  isSelectMode && isSystem && "opacity-50 cursor-not-allowed"
                )} 
                onClick={() => handleAlbumClick(album.id)}
              >
                <div className="relative aspect-[4/5] mb-4">
                  <div className="absolute inset-0 bg-stone-200 rounded-2xl transform rotate-3 translate-x-2 translate-y-1 opacity-60 transition-transform group-hover:rotate-6 group-hover:translate-x-3" />
                  <div className="absolute inset-0 bg-stone-300 rounded-2xl transform -rotate-2 -translate-x-1 translate-y-1 opacity-60 transition-transform group-hover:-rotate-4 group-hover:-translate-x-2" />

                  <div className={cn(
                    "relative h-full w-full rounded-2xl overflow-hidden shadow-sm border border-white/20 bg-stone-100 flex items-center justify-center transition-all",
                    !isSelectMode && "group-hover:shadow-xl",
                    isSelected && "ring-4 ring-[#E09F87] ring-offset-2"
                  )}>
                    {album.cover ? (
                      <>
                        <ImageWithFallback
                          src={album.cover}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className={cn(
                          "absolute inset-0 transition-colors",
                          isSelectMode ? (isSelected ? "bg-black/20" : "bg-black/5") : "bg-black/10 group-hover:bg-black/0"
                        )} />
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

                    {isSelectMode && !isSystem && (
                      <div className={cn(
                        "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-10",
                        isSelected ? "bg-[#E09F87] border-[#E09F87] text-white" : "bg-white/50 border-white text-transparent"
                      )}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}

                    {album.icon && album.cover && (
                      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shadow-sm">
                        <album.icon className="w-4 h-4" />
                      </div>
                    )}

                    {!isSelectMode && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex justify-between items-center text-white">
                          <span className="text-xs font-medium bg-white/20 backdrop-blur-md px-2 py-1 rounded-md border border-white/20">
                            {album.count} photos
                          </span>
                          {!isSystem && (
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
                    )}
                  </div>
                </div>

                <div className="px-1">
                  <h3 className={cn(
                    "font-medium text-lg text-stone-800 transition-colors line-clamp-1",
                    !isSelectMode && "group-hover:text-[#E09F87]"
                  )}>
                    {album.title}
                  </h3>
                  <p className="text-sm text-stone-500 mt-0.5">{album.date}</p>
                </div>
              </div>
            );
          })}

          {!isSelectMode && (
            <button
              onClick={handleOpenCreate}
              className="aspect-[4/5] rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#E09F87] hover:bg-[#E09F87]/5 transition-all flex flex-col items-center justify-center gap-3 group text-stone-400 hover:text-[#E09F87]"
            >
              <div className="w-12 h-12 rounded-full bg-stone-100 group-hover:bg-[#E09F87]/10 flex items-center justify-center transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-medium">New Collection</span>
            </button>
          )}
        </div>
        <div className="h-20" />
      </div>

      <AnimatePresence>
        {isSelectMode && selectedAlbumNames.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-stone-200 px-6 py-4 rounded-3xl shadow-2xl shadow-black/10"
          >
            <div className="flex items-center gap-2 mr-4 border-r border-stone-200 pr-4">
              <span className="w-8 h-8 rounded-full bg-[#E09F87] text-white flex items-center justify-center text-sm font-bold">
                {selectedAlbumNames.length}
              </span>
              <span className="text-stone-600 font-medium whitespace-nowrap">Albums Selected</span>
            </div>

            <Button
              variant="outline"
              className="rounded-xl gap-2 text-rose-500 hover:text-white hover:bg-rose-500 border-rose-100 hover:border-rose-500"
              onClick={handleBatchDeleteAlbums}
            >
              <Trash className="w-4 h-4" />
              Delete {selectedAlbumNames.length > 1 ? 'All' : ''}
            </Button>

            <button 
              onClick={() => setSelectedAlbumNames([])}
              className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl bg-white w-[90vw] md:w-full"><div className="p-8 sm:p-10 flex flex-col items-center text-center space-y-6"><div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-[#E09F87] mb-2 shadow-inner"><FolderPlus className="w-8 h-8" /></div><div className="space-y-2"><DialogTitle className="text-2xl font-semibold text-stone-800 tracking-tight border-none">Create New Album</DialogTitle><DialogDescription className="text-sm text-stone-500 max-w-[280px] mx-auto">Organize your memories into a beautiful new collection.</DialogDescription></div><div className="w-full relative"><Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full text-center text-[16px] md:text-lg py-6 bg-stone-50 border-stone-200 rounded-2xl focus:border-[#E09F87] focus:ring-[#E09F87] transition-all placeholder:text-stone-300 font-medium" placeholder="e.g. Summer in Paris" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSave()}/></div><div className="flex flex-col sm:flex-row gap-3 w-full pt-4"><Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-xl h-12 border-stone-200 text-stone-600 hover:bg-stone-50 font-medium">Cancel</Button><Button onClick={handleSave} className="flex-1 rounded-xl h-12 bg-gradient-to-r from-[#E09F87] to-[#D08E76] text-white shadow-lg shadow-[#E09F87]/20 hover:opacity-90 transition-opacity font-medium">Create Album</Button></div></div></DialogContent>
      </Dialog>

      <Dialog open={!!editingAlbumName} onOpenChange={(open: boolean) => !open && setEditingAlbumName(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl bg-white w-[90vw] md:w-full"><div className="p-8 sm:p-10 flex flex-col items-center text-center space-y-6"><div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center text-stone-500 mb-2 shadow-inner"><Pencil className="w-8 h-8 ml-1" /></div><div className="space-y-2"><DialogTitle className="text-2xl font-semibold text-stone-800 tracking-tight border-none">Edit Album</DialogTitle><DialogDescription className="text-sm text-stone-500 max-w-[280px] mx-auto">Rename your collection or remove it permanently.</DialogDescription></div><div className="w-full relative"><Input id="edit-title" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} className="w-full text-center text-[16px] md:text-lg py-6 bg-stone-50 border-stone-200 rounded-2xl focus:border-[#E09F87] focus:ring-[#E09F87] transition-all placeholder:text-stone-300 font-medium" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUpdateAlbum()}/></div><div className="flex flex-col sm:flex-row gap-3 w-full pt-4"><Button onClick={handleUpdateAlbum} className="flex-1 rounded-xl h-12 bg-stone-800 text-white shadow-lg shadow-stone-900/10 hover:bg-stone-700 transition-colors font-medium">Save Changes</Button><Button variant="outline" onClick={handleDeleteAlbum} className="flex-1 rounded-xl h-12 border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 font-medium bg-rose-50/50">Delete Album</Button></div></div></DialogContent>
      </Dialog>
    </div>
  );
}

