import React, { createContext, useContext, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Photo } from "../../type";
import { X, MapPin, Calendar, Folder, AlignLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePhotoStore } from "../../store/usePhotoStore";

interface PhotoModalContextValue {
    photo: Photo | null;
    onClose: () => void;
}

const PhotoModalContext = createContext<PhotoModalContextValue | null>(null);

function usePhotoModalContext() {
    const context = useContext(PhotoModalContext);
    if (!context) {
        throw new Error("PhotoModal components must be used within a PhotoModal.Root");
    }
    return context;
}

// ----------------------------------------------------
// 1. Root: Context Provider 및 모달 오버레이/애니메이션
// ----------------------------------------------------
interface RootProps {
    photo: Photo | null;
    onClose: () => void;
    children: React.ReactNode;
}

function Root({ photo, onClose, children }: RootProps) {
    if (!photo) return null;

    return createPortal(
        <AnimatePresence mode="wait">
            {photo && (
                <motion.div
                    key="modal-overlay"
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        key="modal-content"
                        className="bg-white rounded-3xl overflow-hidden w-full max-w-6xl flex flex-col md:flex-row h-full max-h-[85vh] relative shadow-2xl shadow-black/50"
                        initial={{ y: 50, scale: 0.95 }}
                        animate={{ y: 0, scale: 1 }}
                        exit={{ y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <PhotoModalContext.Provider value={{ photo, onClose }}>
                            {children}
                        </PhotoModalContext.Provider>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

// ----------------------------------------------------
// 2. Image: 좌측 사진 렌더링 뷰 (모바일에서는 상단)
// ----------------------------------------------------
function Image() {
    const { photo, onClose } = usePhotoModalContext();
    if (!photo) return null;

    return (
        <div className="w-full md:w-2/3 bg-stone-900 flex items-center justify-center relative flex-shrink-0 h-1/2 md:h-full">
            {/* 모바일 최상단 고정 닫기 버튼 */}
            <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex gap-0 items-center justify-center text-stone-800 hover:bg-white transition-colors border border-white/20 shadow-sm md:hidden"
            >
                <X size={20} />
            </button>
            <img
                src={photo.url}
                alt={photo.title}
                className="w-full h-full object-contain"
            />
        </div>
    );
}

// ----------------------------------------------------
// 3. Panel: 우측 상세 정보 패널 (스크롤 영역) Layout
// ----------------------------------------------------
function Panel({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full md:w-1/3 bg-[#F5F2EB] flex flex-col h-1/2 md:h-full overflow-y-auto relative overscroll-contain">
            {children}
        </div>
    );
}

// ----------------------------------------------------
// 4. Header: 모달 제목 및 데스크탑 닫기 버튼
// ----------------------------------------------------
function Header() {
    const { photo, onClose } = usePhotoModalContext();
    if (!photo) return null;

    return (
        <div className="flex items-center justify-between p-6 border-b border-stone-200/50 flex-shrink-0">
            <h3 className="text-2xl font-light text-stone-800 tracking-tight line-clamp-1 break-all">
                {photo.title || "제목 없는 사진"}
            </h3>
            <button
                onClick={onClose}
                aria-label="Close"
                className="hidden md:flex flex-shrink-0 w-10 h-10 bg-white rounded-full items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors shadow-sm"
            >
                <X size={20} />
            </button>
        </div>
    );
}

// ----------------------------------------------------
// 5. Metadata: 날짜, 카테고리, 위치, 설명 렌더링 및 수정 로직
// ----------------------------------------------------
function Metadata() {
    const { photo } = usePhotoModalContext();
    const categories = usePhotoStore(state => state.categories);
    const updatePhotoCategory = usePhotoStore(state => state.updatePhotoCategory);
    const updatePhotoDescription = usePhotoStore(state => state.updatePhotoDescription);

    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempTitle, setTempTitle] = useState(photo?.title || "");
    const [tempDesc, setTempDesc] = useState(photo?.description || "");

    useEffect(() => {
        if (photo) {
            setTempTitle(photo.title || "");
            setTempDesc(photo.description || "");
            setIsEditingCategory(false);
            setIsEditingDesc(false);
        }
    }, [photo]);

    if (!photo) return null;

    const handleCategoryChange = async (newCat: string) => {
        const success = await updatePhotoCategory(photo.id, newCat);
        if (success) setIsEditingCategory(false);
    };

    const handleDescSave = async () => {
        const success = await updatePhotoDescription(photo.id, tempDesc, tempTitle);
        if (success) setIsEditingDesc(false);
    };

    return (
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

            {/* 앨범/태그 */}
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
                                {categories.map((cat) => (
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
                    {photo.tags && photo.tags.length > 0 && photo.tags[0] !== "" && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {photo.tags.map(tag => (
                                <span key={tag} className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
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
                <div className="flex-1 w-full min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Description</p>
                        {!isEditingDesc && (
                            <button
                                onClick={() => setIsEditingDesc(true)}
                                className="text-xs text-[#E09F87] font-medium hover:underline shrink-0 ml-2"
                            >
                                {photo.description ? "Edit" : "Add"}
                            </button>
                        )}
                    </div>
                    {isEditingDesc ? (
                        <div className="space-y-2 w-full">
                            <input
                                className="w-full text-stone-800 font-medium text-sm p-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E09F87] bg-white box-border"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                placeholder="Photo Title"
                                autoFocus
                            />
                            <textarea
                                className="w-full text-stone-600 text-sm leading-relaxed p-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E09F87] bg-white h-24 resize-none box-border"
                                value={tempDesc}
                                onChange={(e) => setTempDesc(e.target.value)}
                                placeholder="Add a description..."
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setIsEditingDesc(false)}
                                    className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDescSave}
                                    className="text-xs text-white bg-[#E09F87] px-3 py-1.5 rounded-lg shadow-sm"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-stone-600 text-sm leading-relaxed overflow-hidden break-words">
                            {photo.description || "Add a note..."}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// 6. Actions: 좋아요, 삭제 등 외부 주입 버튼 영역
// ----------------------------------------------------
function Actions({ children }: { children: React.ReactNode }) {
    return (
        <div className="p-6 bg-white border-t border-stone-100 flex gap-4 w-full flex-shrink-0">
            {children}
        </div>
    );
}

export const PhotoModal = {
    Root,
    Image,
    Panel,
    Header,
    Metadata,
    Actions,
};
