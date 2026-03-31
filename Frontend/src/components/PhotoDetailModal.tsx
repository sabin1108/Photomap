import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Photo } from "../type";
import { X, MapPin, Calendar, Folder, AlignLeft, Heart, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { usePhotoContext } from "../context/PhotoContext";

interface PhotoDetailModalProps {
    photo: Photo | null;
    onClose: () => void;
    onToggleFavorite: (id: string) => void;
    onDelete: (id: string) => void;
}

export function PhotoDetailModal({ photo, onClose, onToggleFavorite, onDelete }: PhotoDetailModalProps) {
    const { categories, updatePhotoCategory, updatePhotoDescription } = usePhotoContext();
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempTitle, setTempTitle] = useState(photo?.title || "");
    const [tempDesc, setTempDesc] = useState(photo?.description || "");

    useEffect(() => {
        if (photo) {
            setTempTitle(photo.title || "");
            setTempDesc(photo.description || "");
        }
    }, [photo]);

    // photo가 null이면 모달을 닫은 상태로 간주
    if (!photo) return null;

    // 앨범 변경 핸들러
    const handleCategoryChange = async (newCat: string) => {
        const success = await updatePhotoCategory(photo.id, newCat);
        if (success) setIsEditingCategory(false);
    };

    // 설명/제목 변경 핸들러
    const handleDescSave = async () => {
        const success = await updatePhotoDescription(photo.id, tempDesc, tempTitle);
        if (success) setIsEditingDesc(false);
    };

    return createPortal(
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="bg-white rounded-3xl overflow-hidden w-full max-w-6xl flex flex-col md:flex-row h-full max-h-[85vh] relative shadow-2xl shadow-black/50"
                    initial={{ y: 50, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 20, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 모바일 최상단 고정 닫기 버튼 */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex gap-0 items-center justify-center text-stone-800 hover:bg-white transition-colors border border-white/20 shadow-sm md:hidden"
                    >
                        <X size={20} />
                    </button>

                    {/* 좌측: 큰 이미지 영역 */}
                    <div className="w-full md:w-2/3 bg-stone-900 flex items-center justify-center relative flex-shrink-0 h-1/2 md:h-full">
                        <img
                            src={photo.url}
                            alt={photo.title}
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* 우측: 상세 정보 패널 영역 */}
                    <div className="w-full md:w-1/3 bg-[#F5F2EB] flex flex-col h-1/2 md:h-full overflow-y-auto">
                        {/* 패널 헤더 */}
                        <div className="flex items-center justify-between p-6 border-b border-stone-200/50">
                            <h3 className="text-2xl font-light text-stone-800 tracking-tight line-clamp-1">
                                {photo.title || "제목 없는 사진"}
                            </h3>
                            <button
                                onClick={onClose}
                                className="hidden md:flex w-10 h-10 bg-white rounded-full items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* 메타데이터 리스트 */}
                        <div className="p-6 space-y-8 flex-1">
                            {/* 촬영일 */}
                            <div className="flex gap-4 items-start group">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100/50 text-[#E09F87] group-hover:bg-[#E09F87] group-hover:text-white transition-colors">
                                    <Calendar size={22} className="stroke-[1.5]" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Date Taken</p>
                                    <p className="text-stone-700 font-medium">{photo.date}</p>
                                </div>
                            </div>

                            {/* 폴더/앨범 */}
                            <div className="flex gap-4 items-start group">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100/50 text-[#AECBEB] group-hover:bg-[#AECBEB] group-hover:text-white transition-colors">
                                    <Folder size={22} className="stroke-[1.5]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Album</p>
                                    <div className="flex justify-between items-center h-8">
                                        {isEditingCategory ? (
                                            <select 
                                                className="text-stone-700 bg-white border border-stone-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#E09F87]"
                                                value={photo.category || "Uncategorized"}
                                                onChange={(e) => handleCategoryChange(e.target.value)}
                                                autoFocus
                                                onBlur={() => setIsEditingCategory(false)}
                                            >
                                                <option value="Uncategorized">Uncategorized</option>
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <>
                                                <p className="text-stone-700 font-medium">{photo.category || "Uncategorized"}</p>
                                                <button 
                                                    onClick={() => setIsEditingCategory(true)}
                                                    className="text-xs text-[#E09F87] font-medium hover:underline"
                                                >
                                                    Move
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 위치 정보 */}
                            <div className="flex gap-4 items-start group">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100/50 text-[#7FB08A] group-hover:bg-[#7FB08A] group-hover:text-white transition-colors">
                                    <MapPin size={22} className="stroke-[1.5]" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Location</p>
                                    <p className="text-stone-700 font-medium leading-relaxed">{photo.location || "Unknown Location"}</p>
                                </div>
                            </div>

                            {/* 설명/메모 */}
                            <div className="flex gap-4 items-start group">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100/50 text-stone-500 group-hover:bg-stone-500 group-hover:text-white transition-colors">
                                    <AlignLeft size={22} className="stroke-[1.5]" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Description</p>
                                        {!isEditingDesc && (
                                            <button 
                                                onClick={() => setIsEditingDesc(true)}
                                                className="text-xs text-[#E09F87] font-medium hover:underline"
                                            >
                                                {photo.description ? "Edit" : "Add"}
                                            </button>
                                        )}
                                    </div>
                                    {isEditingDesc ? (
                                        <div className="space-y-2 w-full">
                                            <input 
                                                className="w-full text-stone-800 font-medium text-sm p-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E09F87] bg-white"
                                                value={tempTitle}
                                                onChange={(e) => setTempTitle(e.target.value)}
                                                placeholder="Photo Title"
                                                autoFocus
                                            />
                                            <textarea 
                                                className="w-full text-stone-600 text-sm leading-relaxed p-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E09F87] bg-white h-24 resize-none"
                                                value={tempDesc}
                                                onChange={(e) => setTempDesc(e.target.value)}
                                                placeholder="Add a description..."
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button 
                                                    onClick={() => setIsEditingDesc(false)}
                                                    className="text-xs text-stone-400 hover:text-stone-600"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleDescSave}
                                                    className="text-xs text-white bg-[#E09F87] px-2 py-1 rounded"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-stone-600 text-sm leading-relaxed">
                                            {photo.description || "Add a note..."}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 하단 액션 버튼 그룹 */}
                        <div className="p-6 bg-white border-t border-stone-100 flex gap-4">
                            <Button
                                variant="outline"
                                className={`flex-1 h-12 rounded-xl border-stone-200 gap-2 transition-all ${photo.isFavorite
                                        ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-600"
                                        : "text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                                    }`}
                                onClick={() => onToggleFavorite(photo.id)}
                            >
                                <Heart size={18} className={photo.isFavorite ? "fill-rose-500" : ""} />
                                {photo.isFavorite ? "Favorited" : "Favorite"}
                            </Button>

                            <Button
                                variant="outline"
                                className="w-12 h-12 p-0 rounded-xl border-stone-200 text-stone-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                                onClick={() => {
                                    if (confirm("Are you sure you want to delete this photo?")) {
                                        onDelete(photo.id);
                                        onClose();
                                    }
                                }}
                            >
                                <Trash2 size={18} />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}