import { useState, useMemo } from 'react';
import { Plus, Share2, Pencil } from 'lucide-react';
// import { cn } from './ui/utils';
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

interface Album {
  id: string;
  title: string;
  cover: string;
  count: number;
  date: string;
  theme: 'dark' | 'light' | 'sepia';
}

export function AlbumsView() {
  const { categories, photos, addCategory } = usePhotoContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '' });

  // Generate albums dynamically from categories
  const albums: Album[] = useMemo(() => {
    return categories.map(category => {
      const categoryPhotos = photos.filter(p => p.tags.includes(category));

      // Sort by date descending (newest first) to ensure the latest photo is the cover
      categoryPhotos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Use the latest photo as cover, or null if empty
      const coverPhoto = categoryPhotos.length > 0 ? categoryPhotos[0].url : '';

      // Determine date range or just use 'Ongoing'
      const date = categoryPhotos.length > 0 ? categoryPhotos[0].date : 'New';

      return {
        id: category, // Use category name as ID for now
        title: category.charAt(0).toUpperCase() + category.slice(1),
        cover: coverPhoto,
        count: categoryPhotos.length,
        date: date,
        theme: 'light' // Default theme
      };
    });
  }, [categories, photos]);

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
          {albums.map((album) => (
            <div key={album.id} className="group cursor-pointer">
              {/* Album Cover Stack Effect */}
              <div className="relative aspect-[4/5] mb-4">
                <div className="absolute inset-0 bg-stone-200 rounded-2xl transform rotate-3 translate-x-2 translate-y-1 opacity-60 transition-transform group-hover:rotate-6 group-hover:translate-x-3" />
                <div className="absolute inset-0 bg-stone-300 rounded-2xl transform -rotate-2 -translate-x-1 translate-y-1 opacity-60 transition-transform group-hover:-rotate-4 group-hover:-translate-x-2" />

                <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-sm border border-white/20 bg-stone-100 flex items-center justify-center">
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
                      <div className="w-12 h-12 rounded-full bg-stone-200/50 flex items-center justify-center">
                        <Plus className="w-5 h-5 opacity-50" />
                      </div>
                      <span className="text-xs font-medium">Empty</span>
                    </div>
                  )}

                  {/* Overlay Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex justify-between items-center text-white">
                      <span className="text-xs font-medium bg-white/20 backdrop-blur-md px-2 py-1 rounded-md border border-white/20">
                        {album.count} photos
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            // Handle edit if needed
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
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

        {/* Footer spacer */}
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
    </div>
  );
}
