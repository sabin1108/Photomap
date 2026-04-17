import { useState } from 'react';
import { Heart, MapPin, Calendar, ArrowUpRight, Filter, X, Share2, Info } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "./ui/dialog";

import { Photo } from '../type';
import { usePhotoStore } from '../store/usePhotoStore';
import { useShallow } from 'zustand/react/shallow';

export function FavoritesView() {
    const { photos, categories } = usePhotoStore(
        useShallow(state => ({ photos: state.photos, categories: state.categories }))
    );
    const toggleFavorite = usePhotoStore(state => state.toggleFavorite);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

    // Only show photos that are marked as favorite
    const favoritePhotos = photos.filter(p => p.isFavorite);

    const filteredPhotos = activeTab === 'all'
        ? favoritePhotos
        : favoritePhotos.filter(photo => photo.tags.includes(activeTab));

    // Combine 'all' with available categories for tabs
    const tabs = ['all', ...categories];

    return (
        <div className="w-full h-full bg-[#F5F2EB] flex flex-col relative overflow-hidden">
            {/* Detail Modal */}
            <Dialog open={!!selectedPhoto} onOpenChange={(open: boolean) => !open && setSelectedPhoto(null)}>
                <DialogContent className="max-w-lg lg:max-w-5xl w-[95vw] lg:w-full p-0 overflow-hidden bg-[#F5F2EB] border-none rounded-3xl h-[90vh] md:h-[85vh] lg:h-[80vh] flex flex-col lg:flex-row">
                    <div className="relative w-full h-[45%] lg:h-full lg:w-[60%] bg-black shrink-0">
                        {selectedPhoto && (
                            <>
                                <ImageWithFallback
                                    src={selectedPhoto.url}
                                    className="w-full h-full object-contain"
                                    alt={selectedPhoto.title}
                                />
                                <div className="absolute top-4 right-4 z-10 md:hidden">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md"
                                        onClick={() => setSelectedPhoto(null)}
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F2EB]">
                        {/* Header Section - Fixed */}
                        <div className="px-5 pt-5 pb-0 md:px-8 md:pt-8 shrink-0">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <DialogTitle className="text-xl md:text-3xl font-light text-stone-800 font-serif italic leading-tight">
                                        {selectedPhoto?.title}
                                    </DialogTitle>
                                    <div className="flex items-center gap-1.5 text-stone-500 text-sm">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {selectedPhoto?.location}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6 custom-scrollbar">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-sm text-stone-600 border-b border-stone-200 pb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[#E09F87]" />
                                        {selectedPhoto?.date}
                                    </div>
                                    <div className="w-px h-3 bg-stone-300" />
                                    <div className="uppercase tracking-wider text-[10px] md:text-xs font-bold text-[#E09F87] px-2 py-0.5 bg-[#E09F87]/10 rounded-full">
                                        {selectedPhoto?.tags[0]}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-medium text-stone-800 flex items-center gap-2 text-sm">
                                        <Info className="w-4 h-4" /> About this moment
                                    </h3>
                                    <DialogDescription className="text-stone-600 text-sm leading-relaxed">
                                        Captured this beautiful moment during my travels. The lighting was perfect and the atmosphere was serene. A memory to cherish forever.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions - Fixed at Bottom */}
                        <div className="p-5 md:p-8 pt-2 md:pt-6 shrink-0 bg-[#F5F2EB]">
                            <div className="flex gap-3">
                                <Button className="flex-1 bg-[#E09F87] hover:bg-[#D08E76] text-white rounded-xl h-11 md:h-12 shadow-lg shadow-orange-900/10 transition-transform active:scale-95">
                                    <Heart className="w-4 h-4 mr-2 fill-current" /> <span>Add to Collection</span>
                                </Button>
                                <Button variant="outline" className="flex-1 border-stone-200 hover:bg-stone-50 text-stone-600 rounded-xl h-11 md:h-12 transition-transform active:scale-95">
                                    <Share2 className="w-4 h-4 mr-2" /> Share
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex-none px-6 pt-16 pb-6 md:px-10 md:py-8 flex flex-col md:flex-row md:items-end justify-between z-10 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-light text-stone-800 tracking-tight flex items-center gap-3">
                        Loved <span className="font-serif italic text-[#E09F87]">Moments</span>
                        <Heart className="w-6 h-6 text-[#E09F87] fill-[#E09F87]" />
                    </h1>
                    <p className="text-stone-500 mt-2 text-sm md:text-base">
                        A curated collection of your most cherished memories.
                    </p>
                </div>

                <div className="w-full lg:w-auto">
                    {/* Mobile: Select Dropdown */}
                    <div className="relative lg:hidden w-full">
                        <details className="w-full [&_summary::-webkit-details-marker]:hidden group">
                            <summary className="w-full list-none appearance-none bg-white border border-stone-200 text-stone-700 py-3 pl-4 pr-10 rounded-2xl text-sm font-medium shadow-sm focus:outline-none focus:border-[#E09F87] focus:ring-1 focus:ring-[#E09F87] transition-all cursor-pointer capitalize select-none">
                                {activeTab}
                            </summary>
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-stone-100 shadow-xl overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-200">
                                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={(e) => {
                                                setActiveTab(tab);
                                                e.currentTarget.closest('details')?.removeAttribute('open');
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between capitalize",
                                                activeTab === tab
                                                    ? "bg-[#E09F87]/10 text-[#E09F87]"
                                                    : "text-stone-600 hover:bg-stone-50"
                                            )}
                                        >
                                            {tab}
                                            {activeTab === tab && (
                                                <Filter className="w-3.5 h-3.5 opacity-50" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </details>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
                            <Filter className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Desktop: Filter Buttons */}
                    <div className="hidden lg:flex flex-wrap items-center gap-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap capitalize",
                                    activeTab === tab
                                        ? "bg-stone-800 text-white shadow-md"
                                        : "bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Gallery Content */}
            <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPhotos.map((photo) => (
                        <div key={photo.id} className="relative group animate-in fade-in duration-500">
                            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-stone-200 shadow-sm transition-transform duration-500 group-hover:-translate-y-1">
                                <ImageWithFallback
                                    src={photo.url}
                                    className="w-full h-full object-cover"
                                    alt={photo.title}
                                />

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                {/* Content Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h3 className="text-white font-medium text-lg leading-tight">{photo.title}</h3>
                                            <div className="flex items-center gap-2 text-white/80 text-xs mt-1">
                                                <MapPin className="w-3 h-3" />
                                                <span>{photo.location}</span>
                                            </div>
                                        </div>
                                        <Button
                                            size="icon"
                                            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-stone-900 border border-white/30"
                                            onClick={() => setSelectedPhoto(photo)}
                                        >
                                            <ArrowUpRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Top Right Heart */}
                                <div
                                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(photo.id);
                                    }}
                                >
                                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30 hover:bg-white/40">
                                        <Heart className={cn("w-4 h-4", photo.isFavorite ? "text-red-500 fill-red-500" : "text-white")} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer spacer */}
                <div className="h-20" />
            </div>
        </div>
    );
}
