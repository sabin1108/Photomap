import { Photo } from "../type";
import { X, MapPin, Calendar, Folder, AlignLeft, Heart, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";

interface PhotoDetailModalProps {
    photo: Photo | null;
    onClose: () => void;
    onToggleFavorite: (id: string) => void;
    onDelete: (id: string) => void;
}

export function PhotoDetailModal({ photo, onClose, onToggleFavorite, onDelete }: PhotoDetailModalProps) {
    // photo가 null이면 모달을 닫은 상태로 간주
    if (!photo) return null;
    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
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
                        {/* 데스크탑 닫기 버튼 (이미지 위 좌측상단에 띄우거나 패널 우측상단에 띄움. 여기선 패널 쪽으로 옮김) */}
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
                                    <div className="flex justify-between items-center">
                                        <p className="text-stone-700 font-medium">{photo.category || "Uncategorized"}</p>
                                        <button className="text-xs text-[#E09F87] font-medium hover:underline">Move</button>
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
                                    {photo.lat && photo.lng && (
                                        <p className="text-stone-400 text-xs mt-1 font-mono">
                                            {photo.lat.toFixed(4)}, {photo.lng.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 설명/메모 */}
                            <div className="flex gap-4 items-start group">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100/50 text-stone-500 group-hover:bg-stone-500 group-hover:text-white transition-colors">
                                    <AlignLeft size={22} className="stroke-[1.5]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Description</p>
                                    {photo.description ? (
                                        <p className="text-stone-600 text-sm leading-relaxed">{photo.description}</p>
                                    ) : (
                                        <button className="text-[#E09F87] text-sm font-medium hover:underline">Add a note...</button>
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
        </AnimatePresence>
    );
}