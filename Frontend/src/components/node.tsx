import { useState, useEffect, useRef } from 'react';
import { usePhotoContext } from '../context/PhotoContext';
import { Photo } from '../type';
import { PhotoDetailModal } from './PhotoDetailModal';

const getVariableRadius = (seed: string, maxR: number) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const factor = 0.6 + (Math.abs(hash % 100) / 250);
    return maxR * factor;
};

export function NodeView() {
    const { photos, toggleFavorite, deletePhoto } = usePhotoContext();
    const [selectedPhotoDetail, setSelectedPhotoDetail] = useState<Photo | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [maxRadius, setMaxRadius] = useState(180);

    // 필터 상태
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

    // 애니메이션 트랜지션 관리를 위한 상태
    const [isExiting, setIsExiting] = useState(false);
    const [nextState, setNextState] = useState<{ tag: string | null, loc: string | null } | null>(null);
    const [animationKey, setAnimationKey] = useState(0);

    // 화면 크기에 따른 반경 계산
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const minDimension = Math.min(rect.width, rect.height);
                const safeRadius = Math.max(100, (minDimension / 2) - 80);
                setMaxRadius(Math.min(safeRadius, 300));
            }
        };
        setTimeout(updateDimensions, 50);
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // 트랜지션 로직: isExiting이 true가 되면, 애니메이션이 끝날 때까지 기다렸다가 상태를 업데이트합니다.
    useEffect(() => {
        if (isExiting && nextState !== null) {
            const timer = setTimeout(() => {
                setSelectedTag(nextState.tag);
                setSelectedLocation(nextState.loc);
                setIsExiting(false);
                setNextState(null);
                setAnimationKey(prev => prev + 1); // 새 화면에서 뻗어나가는 애니메이션 트리거
            }, 400); // 빨려 들어가는 애니메이션 시간 (0.4초)
            return () => clearTimeout(timer);
        }
    }, [isExiting, nextState]);

    // 필터를 변경할 때 즉시 바꾸지 않고 트랜지션을 시작하는 함수
    const handleTransition = (newTag: string | null, newLoc: string | null) => {
        // 이미 트랜지션 중이거나, 변경 사항이 없으면 무시
        if (isExiting || (newTag === selectedTag && newLoc === selectedLocation)) return;
        setIsExiting(true);
        setNextState({ tag: newTag, loc: newLoc });
    };

    const tagsList = Array.from(new Set(photos.flatMap(p => p.tags || []).filter(t => t && t.trim() !== '')));
    const locationsList = Array.from(new Set(photos.map(p => p.location).filter(l => l && l.trim() !== '')));

    const isTagMode = !selectedTag;
    let displayNodes: any[] = [];

    if (isTagMode) {
        displayNodes = tagsList.slice(0, 8).map(tag => ({
            isTag: true,
            id: `tag-${tag}`,
            label: tag,
            radius: maxRadius * 0.8
        }));
    } else {
        const filteredPhotos = photos.filter(p => {
            const matchTag = (p.tags || []).includes(selectedTag!);
            const matchLoc = selectedLocation ? p.location === selectedLocation : true;
            return matchTag && matchLoc;
        });

        displayNodes = filteredPhotos.slice(0, 10).map(photo => ({
            isTag: false,
            id: `photo-${photo.id}`,
            photo: photo,
            radius: getVariableRadius(photo.location || String(photo.id), maxRadius)
        }));
    }

    const nodeCount = displayNodes.length;
    const centralLabel = isTagMode ? '모든 기억' : selectedTag;
    const centralPhoto = !isTagMode && displayNodes.length > 0 && !displayNodes[0].isTag
        ? displayNodes[0].photo
        : (photos.length > 0 ? photos[0] : null);

    const angleOffset = nodeCount <= 2 ? -Math.PI / 4 : -Math.PI / 2;

    return (
        <div className="flex-1 p-4 md:p-8 bg-[#F5F2EB] h-full w-full flex flex-col overflow-hidden relative">

            {/* IN & OUT 애니메이션 키프레임 */}
            <style>{`
                /* 뻗어나가는 애니메이션 (IN) */
                @keyframes flyOutNode {
                    0% { transform: translate(-50%, -50%) translate(0px, 0px) scale(0.2); opacity: 0; }
                    60% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1.05); opacity: 1; }
                    100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1); opacity: 1; }
                }
                @keyframes growLine {
                    0% { transform: scale(0); opacity: 0; }
                    100% { transform: scale(1); opacity: 0.5; }
                }

                /* 중앙으로 빨려 들어가는 애니메이션 (OUT) */
                @keyframes flyInNode {
                    0% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(0); opacity: 0; }
                }
                @keyframes shrinkLine {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(0); opacity: 0; }
                }

                /* 클래스 적용 */
                .animate-in {
                    animation: flyOutNode 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
                .animate-out {
                    animation: flyInNode 0.4s cubic-bezier(0.5, 0, 0.2, 1) forwards !important;
                }
                .line-in {
                    transform-origin: 50% 50%;
                    animation: growLine 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
                .line-out {
                    transform-origin: 50% 50%;
                    animation: shrinkLine 0.4s cubic-bezier(0.5, 0, 0.2, 1) forwards !important;
                }
            `}</style>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 z-50 px-2 md:px-0 flex-none">
                <div className="flex-1 min-w-0">
                    <h1 className="text-3xl md:text-4xl font-serif italic text-stone-800 tracking-tight leading-none mb-2">
                        Spatial Connections
                    </h1>
                    <p className="text-xs text-stone-500 font-sans hidden md:block max-w-md leading-relaxed truncate md:whitespace-normal">
                        {isTagMode
                            ? "원하는 태그를 클릭하여 해당 기억의 조각들을 펼쳐보세요."
                            : "중앙 원을 클릭하면 다시 전체 목록으로 돌아갑니다."}
                    </p>
                </div>

                {/* 필터 (드롭다운 변경 시에도 트랜지션 적용) */}
                <div className="flex flex-wrap items-center gap-2 pb-1 justify-start md:justify-end">
                    <span className="text-[10px] uppercase tracking-widest text-[#E09F87] font-bold mr-1 whitespace-nowrap hidden sm:inline-block">Filter</span>
                    <select
                        className="text-xs px-3 py-2 rounded-full border border-stone-200 bg-white shadow-sm font-medium text-stone-600 outline-none focus:border-[#E09F87] transition-all cursor-pointer min-w-[100px] disabled:opacity-50"
                        value={selectedTag || ''}
                        disabled={isExiting}
                        onChange={(e) => handleTransition(e.target.value || null, selectedLocation)}
                    >
                        <option value="">All Tags</option>
                        {tagsList.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                </div>
            </div>

            <div
                ref={containerRef}
                className="relative flex-1 w-full bg-gradient-to-br from-[#f8f6f0] via-white to-[#fdfbf7] rounded-3xl overflow-hidden border border-[#E09F87]/20 shadow-sm min-h-0 group"
            >
                <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-[#E09F87]/10 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-stone-200/40 rounded-full blur-[80px] pointer-events-none" />

                {/* 연결선 SVG */}
                <svg key={`svg-${animationKey}`} className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {displayNodes.map((node, i) => {
                        const angle = (i * 2 * Math.PI) / (nodeCount || 1) + angleOffset;
                        const dx = Math.cos(angle) * node.radius;
                        const dy = Math.sin(angle) * node.radius;

                        return (
                            <line
                                key={`line-${node.id}`}
                                className={isExiting ? "line-out" : "line-in"}
                                x1="50%"
                                y1="50%"
                                x2={`calc(50% + ${dx}px)`}
                                y2={`calc(50% + ${dy}px)`}
                                style={{
                                    strokeDasharray: "4 4",
                                    stroke: "#E09F87",
                                    strokeWidth: 1.5,
                                    opacity: 0,
                                    // 들어갈 때는 딜레이 없이 한 번에, 나올 때는 딜레이를 주어 순차적으로
                                    animationDelay: isExiting ? '0s' : `${i * 0.03}s`
                                }}
                            />
                        );
                    })}
                </svg>

                {/* 중앙 메인 노드 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
                    <div
                        className={`w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#E09F87] p-1 shadow-lg relative transition-all duration-300 ${!isTagMode && !isExiting ? 'cursor-pointer hover:scale-105 hover:shadow-[#E09F87]/40' : ''}`}
                        onClick={() => {
                            if (!isTagMode && !isExiting) handleTransition(null, selectedLocation); // 메인 노드 클릭 시 뒤로가기
                        }}
                    >
                        <div className="w-full h-full rounded-full overflow-hidden border-[3px] border-white relative bg-stone-50 z-10 flex items-center justify-center">
                            {centralPhoto ? (
                                <img alt={centralLabel || 'center'} className={`w-full h-full object-cover transition-transform duration-700 ${!isExiting ? 'hover:scale-110' : ''}`} src={centralPhoto.url} />
                            ) : (
                                <div className="w-4 h-4 rounded-full bg-stone-300 animate-pulse" />
                            )}
                        </div>

                        <div className={`absolute top-[105%] left-1/2 -translate-x-1/2 mt-3 z-20 pointer-events-none transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
                            <span className="text-stone-600 bg-white/90 backdrop-blur-md shadow-sm border border-stone-200/50 text-xs md:text-sm font-medium px-4 py-1.5 rounded-full text-center whitespace-nowrap flex flex-col items-center tracking-wide">
                                {centralLabel}
                                {!isTagMode && <span className="text-[9px] text-stone-400 mt-0.5 tracking-wider">돌아가기</span>}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 동적 노드들 */}
                {displayNodes.map((node, i) => {
                    const angle = (i * 2 * Math.PI) / (nodeCount || 1) + angleOffset;
                    const dx = Math.cos(angle) * node.radius;
                    const dy = Math.sin(angle) * node.radius;

                    return (
                        <div
                            key={`node-${animationKey}-${node.id}`}
                            className={`absolute z-20 group ${isExiting ? 'animate-out pointer-events-none' : 'animate-in hover:z-40 cursor-pointer'}`}
                            style={{
                                left: '50%',
                                top: '50%',
                                '--dx': `${dx}px`,
                                '--dy': `${dy}px`,
                                animationDelay: isExiting ? '0s' : `${i * 0.03}s`,
                                opacity: 0,
                            } as React.CSSProperties}
                            onClick={() => {
                                if (isExiting) return;
                                if (node.isTag) handleTransition(node.label, selectedLocation); // 태그 클릭 시 중앙으로 빨려 들어감
                                else setSelectedPhotoDetail(node.photo); // 사진은 모달 띄우기
                            }}
                        >
                            {node.isTag ? (
                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-stone-200 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-[#E09F87] transition-all duration-300 relative flex items-center justify-center p-2 group-hover:-translate-y-1">
                                    <span className="text-[10px] md:text-xs font-medium text-stone-600 text-center leading-tight break-keep">
                                        #{node.label}
                                    </span>
                                </div>
                            ) : (
                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-white bg-white shadow-md group-hover:scale-110 group-hover:shadow-xl group-hover:border-[#E09F87] transition-all duration-300 relative">
                                    <img className="w-full h-full rounded-full object-cover" src={node.photo.url} alt={node.photo.title} />

                                    <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm border border-[#E09F87]/20 flex flex-col items-center min-w-max">
                                        <span className="text-[11px] font-semibold text-stone-700">
                                            {node.photo.title || '제목 없음'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <PhotoDetailModal
                photo={selectedPhotoDetail}
                onClose={() => setSelectedPhotoDetail(null)}
                onToggleFavorite={toggleFavorite}
                onDelete={(id) => {
                    deletePhoto(id);
                    setSelectedPhotoDetail(null);
                }}
            />
        </div>
    );
}