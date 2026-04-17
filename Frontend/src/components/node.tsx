import { useState, useEffect, useRef } from 'react';
import { zoom, } from 'd3-zoom';
import { select } from 'd3-selection';
import { usePhotoStore } from '../store/usePhotoStore';
import { Photo } from '../type';
import { PhotoModal } from './ui/photo-modal';
import { Button } from './ui/button';
import { Heart, Trash2 } from 'lucide-react';
import { cn } from './ui/utils';
import { useForceSimulation, GraphNode } from '../hooks/useForceSimulation';

export function NodeView() {
    const photos = usePhotoStore(state => state.photos);
    const toggleFavorite = usePhotoStore(state => state.toggleFavorite);
    const deletePhoto = usePhotoStore(state => state.deletePhoto);
    const [selectedPhotoDetail, setSelectedPhotoDetail] = useState<Photo | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [maxTags, setMaxTags] = useState(7);
    const [maxRadius, setMaxRadius] = useState(180);
    const zoomGroupRef = useRef<HTMLDivElement>(null);

    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

    const [isExiting, setIsExiting] = useState(false);
    const [nextState, setNextState] = useState<{ tag: string | null, loc: string | null } | null>(null);
    const [animationKey, setAnimationKey] = useState(0);

    // 반응형 크기 처리
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const minDimension = Math.min(rect.width, rect.height);
                setMaxRadius(Math.min(Math.max(160, (minDimension / 2) - 70), 350));
            }
        };
        setTimeout(updateDimensions, 50);
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // 트랜지션 효과 처리
    useEffect(() => {
        if (isExiting && nextState !== null) {
            const timer = setTimeout(() => {
                setSelectedTag(nextState.tag);
                setSelectedLocation(nextState.loc);
                setIsExiting(false);
                setNextState(null);
                setAnimationKey(prev => prev + 1);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isExiting, nextState]);

    const handleTransition = (newTag: string | null, newLoc: string | null) => {
        if (isExiting || (newTag === selectedTag && newLoc === selectedLocation)) return;
        setIsExiting(true);
        setNextState({ tag: newTag, loc: newLoc });
    };

    // Zoom 기능 초기화
    useEffect(() => {
        if (!containerRef.current) return;
        const zoomBehavior = zoom<HTMLDivElement, unknown>()
            .scaleExtent([0.3, 4])
            .filter((e: any) => e.type === 'wheel' || (e.target.closest('.d3-drag-node') ? false : !e.defaultPrevented))
            .on("zoom", (e) => {
                if (zoomGroupRef.current) {
                    zoomGroupRef.current.style.transform = `translate(${e.transform.x}px, ${e.transform.y}px) scale(${e.transform.k})`;
                }
            });

        select(containerRef.current).call(zoomBehavior);
        return () => { select(containerRef.current).on(".zoom", null); };
    }, []);

    const isTagMode = !selectedTag;
    const tagsList = Array.from(new Set(photos.flatMap(p => p.tags || []).filter(t => t && t.trim() !== '')));
    const displayTags = isTagMode ? tagsList.slice(0, maxTags) : [];

    //D3 물리 엔진을 Custom Hook으로 완전 분리 호출하여 코드 대폭 감축
    const { simData, simRef } = useForceSimulation({
        photos, isTagMode, displayTags, selectedTag, selectedLocation, maxRadius, animationKey
    });

    const centerNode = simData.nodes.find(n => n.type === 'center');
    const dynamicNodes = simData.nodes.filter(n => n.type !== 'center');
    const centralPhoto = !isTagMode && dynamicNodes.length > 0 ? dynamicNodes[0].photo : (photos.length > 0 ? photos[0] : null);

    // DOM 직접 조작으로 Hover 트랜지션 처리 (무한 재렌더링 방지)
    const handleHoverNode = (nodeId: string | null) => {
        if (isExiting) return;

        simData.lines.forEach(line => {
            const lineId = typeof line.source === 'object' ? (line.source as any).id : line.source;
            const targetId = typeof line.target === 'object' ? (line.target as any).id : line.target;

            const el = document.getElementById(`line-dom-${animationKey}-${line.id}`);
            if (!el) return;

            if (!nodeId) {
                el.style.opacity = line.isSecondary ? '0.15' : '0.35';
                el.style.strokeWidth = line.isSecondary ? '0.8px' : '1.2px';
                el.style.strokeDasharray = line.isSecondary ? '2, 6' : '4, 4';
            } else {
                const isLineActive = lineId === nodeId || targetId === nodeId;
                el.style.opacity = isLineActive ? '0.8' : '0.05';
                el.style.strokeWidth = isLineActive ? '2.5px' : (line.isSecondary ? '0.8px' : '1.2px');
                el.style.strokeDasharray = isLineActive ? 'none' : (line.isSecondary ? '2, 6' : '4, 4');
            }
        });

        dynamicNodes.forEach(node => {
            const el = document.getElementById(`node-inner-${animationKey}-${node.id}`);
            if (!el) return;

            if (!nodeId) {
                el.style.opacity = '1';
            } else {
                const isActive = nodeId === node.id || simData.lines.some(l =>
                    ((typeof l.source === 'object' ? (l.source as any).id : l.source) === nodeId && (typeof l.target === 'object' ? (l.target as any).id : l.target) === node.id) ||
                    ((typeof l.target === 'object' ? (l.target as any).id : l.target) === nodeId && (typeof l.source === 'object' ? (l.source as any).id : l.source) === node.id)
                );
                el.style.opacity = isActive ? '1' : '0.2';
            }
        });
    };

    // 노드 드래그 핸들러
    const handlePointerDown = (e: React.PointerEvent, node: GraphNode) => {
        if (isExiting) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        node.fx = node.x; node.fy = node.y; node.dragMoved = false;
        if (simRef.current) simRef.current.alphaTarget(0.3).restart();
    };
    const handlePointerMove = (e: React.PointerEvent, node: GraphNode) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        if (!node.dragMoved && (Math.abs(e.movementX) > 1 || Math.abs(e.movementY) > 1)) node.dragMoved = true;
        node.fx = (node.fx || node.x!) + e.movementX;
        node.fy = (node.fy || node.y!) + e.movementY;
    };
    const handlePointerUp = (e: React.PointerEvent, node: GraphNode) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (node.type !== 'center') { node.fx = null; node.fy = null; }
        if (simRef.current) simRef.current.alphaTarget(0);
    };

    return (
        <div className="flex-1 p-4 md:p-8 bg-[#F5F2EB] h-full w-full flex flex-col overflow-hidden relative">
            <style>{`
                @keyframes flyOutNode {
                    0% { transform: translate(-50%, -50%) translate(0px, 0px) scale(0.2); opacity: 0; }
                    60% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1.05); opacity: 1; }
                    100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1); opacity: 1; }
                }
                @keyframes flyInNode {
                    0% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(0); opacity: 0; }
                }
                .animate-in { animation: flyOutNode 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .animate-out { animation: flyInNode 0.4s cubic-bezier(0.5, 0, 0.2, 1) forwards !important; }
            `}</style>

            {/* 상단 컨트롤 영역 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 z-50 px-2 md:px-0 flex-none">
                <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-serif italic text-stone-800 tracking-tight leading-none mb-2">Spatial Connections</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 pb-1 justify-start md:justify-end">
                    {isTagMode && (
                        <select
                            className="text-xs px-3 py-2 rounded-full border border-stone-200 bg-white"
                            value={maxTags} onChange={(e) => setMaxTags(Number(e.target.value))}
                        >
                            {[3, 5, 7, 10, 15].map(n => <option key={n} value={n}>Top {n} Tags</option>)}
                        </select>
                    )}
                    <select
                        className="text-xs px-3 py-2 rounded-full border border-stone-200 bg-white min-w-[100px] disabled:opacity-50"
                        value={selectedTag || ''} disabled={isExiting}
                        onChange={(e) => handleTransition(e.target.value || null, selectedLocation)}
                    >
                        <option value="">All Tags</option>
                        {tagsList.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                </div>
            </div>

            {/* D3 시뮬레이션 및 렌더링 맵 영역 */}
            <div ref={containerRef} className="relative flex-1 w-full bg-gradient-to-br from-[#f8f6f0] via-white to-[#fdfbf7] rounded-3xl overflow-hidden border border-[#E09F87]/20 shadow-sm min-h-0" style={{ touchAction: "none" }}>
                <div ref={zoomGroupRef} className="absolute inset-0 w-full h-full origin-top-left" style={{ transform: `translate(0px, 0px) scale(1)` }}>
                    <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-[#E09F87]/10 rounded-full blur-[60px]" />
                    <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-stone-200/40 rounded-full blur-[80px]" />

                    {/* 라인(연결 선) SVG 렌더링 */}
                    <svg key={`svg-${animationKey}`} className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        {simData.lines.map((line) => {
                            return (
                                <line id={`line-dom-${animationKey}-${line.id}`} key={line.id}
                                    x1="50%" y1="50%" x2="50%" y2="50%"
                                    style={{
                                        strokeDasharray: line.isSecondary ? "2, 6" : "4, 4",
                                        stroke: "#E09F87", strokeWidth: line.isSecondary ? 0.8 : 1.2,
                                        opacity: isExiting ? 0 : (line.isSecondary ? 0.15 : 0.35),
                                        transition: "stroke 0.3s, stroke-width 0.3s, opacity 0.3s",
                                    } as any}
                                />
                            );
                        })}
                    </svg>

                    {/* 중앙 메인 노드 렌더링 */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#E09F87] p-1 shadow-lg relative transition duration-300 ${!isTagMode && !isExiting ? 'cursor-pointer hover:scale-105' : ''}`}
                            onClick={() => { if (!isTagMode && !isExiting) handleTransition(null, selectedLocation); }}>
                            <div className="w-full h-full rounded-full border-[3px] border-white overflow-hidden z-10 bg-stone-50 flex items-center justify-center">
                                {centralPhoto ? <img alt="center" className={`w-full h-full object-cover transition-transform duration-700 ${!isExiting ? 'hover:scale-110' : ''}`} src={centralPhoto.url} /> : <div className="w-4 h-4 bg-stone-300 animate-pulse rounded-full" />}
                            </div>
                            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 pointer-events-none transition-opacity ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
                                <span className="text-stone-700 bg-white border text-[10px] md:text-xs font-semibold px-3 py-1 rounded-full text-center whitespace-nowrap">{centerNode?.label}</span>
                            </div>
                        </div>
                    </div>

                    {/* 기타(태그/사진) 노드 배열 렌더링 */}
                    {dynamicNodes.map((node, i) => {
                        return (
                            <div id={`node-dom-${animationKey}-${node.id}`} key={`node-${animationKey}-${node.id}`}
                                className={`absolute z-20 group d3-drag-node ${isExiting ? 'animate-out pointer-events-none' : 'animate-in hover:z-40 cursor-grab active:cursor-grabbing'}`}
                                style={{
                                    left: '50%', top: '50%',
                                    // hook에서 주입한 tick 상태에 따라 실시간 변경됨
                                    '--dx': `${node.x || 0}px`, '--dy': `${node.y || 0}px`,
                                    animationDelay: isExiting ? '0s' : `${i * 0.03}s`
                                } as React.CSSProperties}
                                onPointerEnter={() => handleHoverNode(node.id)} onPointerLeave={() => handleHoverNode(null)}
                                onPointerDown={(e) => handlePointerDown(e, node)}
                                onPointerMove={(e) => handlePointerMove(e, node)}
                                onPointerUp={(e) => handlePointerUp(e, node)}
                                onClick={() => {
                                    if (node.dragMoved || isExiting) return;
                                    node.type === 'tag' ? handleTransition(node.label!, selectedLocation) : setSelectedPhotoDetail(node.photo!);
                                }}
                            >
                                <div id={`node-inner-${animationKey}-${node.id}`} style={{ opacity: 1, transition: 'opacity 0.3s' }}>
                                    {node.type === 'tag' ? (
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border bg-white shadow-sm flex items-center justify-center p-1 group-hover:-translate-y-1">
                                            <span className="text-[10px] font-semibold text-stone-600">#{node.label}</span>
                                        </div>
                                    ) : (node.type === 'photo' && node.photo) && (
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-white shadow-md group-hover:scale-110 relative">
                                            <img className="w-full h-full rounded-full object-cover" src={node.photo.url} alt="" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 사진 상세보기 모달 영역 */}
            <PhotoModal.Root photo={selectedPhotoDetail} onClose={() => setSelectedPhotoDetail(null)}>
                <PhotoModal.Image />
                <PhotoModal.Panel>
                    <PhotoModal.Header />
                    <PhotoModal.Metadata />
                    <PhotoModal.Actions>
                        <Button variant="outline" className={cn("flex-1 h-12 rounded-xl gap-2", selectedPhotoDetail?.isFavorite ? "bg-rose-50 border-rose-200 text-rose-500" : "")}
                            onClick={() => { if (selectedPhotoDetail) { toggleFavorite(selectedPhotoDetail.id); setSelectedPhotoDetail(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null); } }}>
                            <Heart size={18} className={selectedPhotoDetail?.isFavorite ? "fill-rose-500" : ""} /> {selectedPhotoDetail?.isFavorite ? "Favorited" : "Favorite"}
                        </Button>
                        <Button variant="outline" className="w-12 h-12 p-0 text-red-500 hover:bg-red-50"
                            onClick={() => { if (selectedPhotoDetail && window.confirm("Delete?")) { deletePhoto(selectedPhotoDetail.id); setSelectedPhotoDetail(null); } }}>
                            <Trash2 size={18} />
                        </Button>
                    </PhotoModal.Actions>
                </PhotoModal.Panel>
            </PhotoModal.Root>
        </div>
    );
}