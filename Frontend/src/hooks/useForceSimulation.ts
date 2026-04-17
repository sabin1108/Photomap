import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3-force';
import { Photo } from '../type';

export type GraphNode = d3.SimulationNodeDatum & {
    id: string;
    type: 'center' | 'tag' | 'photo';
    label?: string;
    photo?: Photo;
    radius: number;
    angle: number;
    dragMoved?: boolean;
};

export type GraphLine = d3.SimulationLinkDatum<GraphNode> & {
    id: string;
    delay: number;
    isSecondary?: boolean;
};

const getVariableRadius = (seed: string, maxR: number) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const factor = 0.6 + (Math.abs(hash % 100) / 250);
    return maxR * factor;
};

interface UseNodeSimulationProps {
    photos: Photo[];
    isTagMode: boolean;
    displayTags: string[];
    selectedTag: string | null;
    selectedLocation: string | null;
    maxRadius: number;
    animationKey: number;
}

export function useForceSimulation({
    photos, isTagMode, displayTags, selectedTag, selectedLocation, maxRadius, animationKey
}: UseNodeSimulationProps) {
    const [simData, setSimData] = useState<{ nodes: GraphNode[], lines: GraphLine[] }>({ nodes: [], lines: [] });
    const simRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);

    useEffect(() => {
        const displayNodes: GraphNode[] = [];
        const displayLines: GraphLine[] = [];

        const tagRadius = Math.max(140, maxRadius * 0.65);
        const photoRadius = maxRadius * 1.05;

        if (isTagMode) {
            displayNodes.push({
                id: 'center', type: 'center', label: '모든 기억', radius: 0, angle: 0, fx: 0, fy: 0
            });

            const tagAngleMap = new Map<string, number>();

            displayTags.forEach((tag, i) => {
                const angle = -Math.PI / 2 + (i * 2 * Math.PI) / (displayTags.length || 1);
                tagAngleMap.set(tag, angle);
                displayNodes.push({ id: `tag-${tag}`, type: 'tag', label: tag, radius: tagRadius, angle: angle });
                displayLines.push({ id: `line-center-${tag}`, source: 'center', target: `tag-${tag}`, delay: i * 0.05 });
            });

            const groupMap = new Map<string, Photo[]>();
            displayTags.forEach(t => groupMap.set(t, []));

            let photoList = photos.filter(p => p.tags?.some(t => tagAngleMap.has(t)));
            photoList = photoList.slice(0, 50);

            photoList.forEach(p => {
                const primary = p.tags!.find(t => tagAngleMap.has(t));
                if (primary) groupMap.get(primary)!.push(p);
            });

            let photoDelayIdx = 0;
            displayTags.forEach((tag) => {
                const tAngle = tagAngleMap.get(tag)!;
                const groupPhotos = groupMap.get(tag)!;
                const sectorWidth = (2 * Math.PI) / (displayTags.length || 1);
                const spread = sectorWidth * 0.7;

                groupPhotos.forEach((photo, i) => {
                    let pAngle = tAngle;
                    if (groupPhotos.length > 1) {
                        const step = spread / (groupPhotos.length - 1);
                        pAngle = tAngle - spread / 2 + (i * step);
                    }
                    const radiusOffsets = [0, 25, -15, 35, -25];
                    const rOffset = radiusOffsets[i % radiusOffsets.length];
                    const pRadius = photoRadius + rOffset;

                    displayNodes.push({
                        id: `photo-${photo.id}`, type: 'photo', photo: photo, radius: pRadius, angle: pAngle
                    });

                    const relatedTags = photo.tags!.filter(t => tagAngleMap.has(t));
                    const primaryTag = relatedTags[0];
                    relatedTags.forEach(rTag => {
                        displayLines.push({
                            id: `line-${rTag}-${photo.id}`, source: `tag-${rTag}`, target: `photo-${photo.id}`,
                            delay: 0.3 + photoDelayIdx * 0.02, isSecondary: rTag !== primaryTag
                        });
                    });
                    photoDelayIdx++;
                });
            });

        } else {
            const filteredPhotos = photos.filter(p => {
                const matchTag = (p.tags || []).includes(selectedTag!);
                const matchLoc = selectedLocation ? p.location === selectedLocation : true;
                return matchTag && matchLoc;
            });

            displayNodes.push({
                id: 'center', type: 'center', label: selectedTag!, radius: 0, angle: 0, fx: 0, fy: 0
            });

            const displayPhotos = filteredPhotos.slice(0, 30);
            displayPhotos.forEach((photo, i) => {
                const angle = -Math.PI / 2 + (i * 2 * Math.PI) / (displayPhotos.length || 1);
                const radius = getVariableRadius(photo.location || String(photo.id), maxRadius);

                displayNodes.push({
                    id: `photo-${photo.id}`, type: 'photo', photo: photo, radius: radius, angle: angle
                });
                displayLines.push({
                    id: `line-center-${photo.id}`, source: 'center', target: `photo-${photo.id}`, delay: i * 0.03
                });
            });
        }

        displayNodes.forEach(n => {
            n.x = Math.cos(n.angle) * n.radius;
            n.y = Math.sin(n.angle) * n.radius;
        });

        setSimData({ nodes: displayNodes, lines: displayLines });

        // D3 물리 엔진 시동
        const sim = d3.forceSimulation<GraphNode>(displayNodes)
            .force("link", d3.forceLink<GraphNode, GraphLine>(displayLines)
                .id(d => d.id)
                .distance((d: any) => {
                    if (d.isSecondary) return maxRadius * 1.5;
                    const sourceNode = typeof d.source === 'object' ? d.source : displayNodes.find(n => n.id === d.source);
                    if (sourceNode && sourceNode.type === 'center') return tagRadius;
                    return photoRadius - tagRadius;
                })
                .strength((d: any) => d.isSecondary ? 0.03 : 0.8)
            )
            .force("charge", d3.forceManyBody<GraphNode>().strength(d => d.type === 'center' ? -1500 : (d.type === 'tag' ? -800 : -200)))
            .force("collide", d3.forceCollide<GraphNode>().radius(d => d.type === 'center' ? 50 : 45).iterations(2))
            .force("radial", d3.forceRadial<GraphNode>(d => d.radius, 0, 0).strength(0.3));

        simRef.current = sim as d3.Simulation<GraphNode, undefined>;

        sim.on("tick", () => {
            // 노드 업데이트: CSS 변수(--dx, --dy)만 실시간으로 수정
            displayNodes.forEach(node => {
                const el = document.getElementById(`node-dom-${animationKey}-${node.id}`);
                if (el) {
                    el.style.setProperty('--dx', `${node.x || 0}px`);
                    el.style.setProperty('--dy', `${node.y || 0}px`);
                }
            });
            // 라인 업데이트: SVG의 x, y 속성을 직접 수정
            displayLines.forEach(line => {
                const s = line.source as GraphNode;
                const t = line.target as GraphNode;
                const el = document.getElementById(`line-dom-${animationKey}-${line.id}`);
                if (el && s && t && typeof s !== 'string' && typeof t !== 'string') {
                    el.setAttribute('x1', `calc(50% + ${s.x || 0}px)`);
                    el.setAttribute('y1', `calc(50% + ${s.y || 0}px)`);
                    el.setAttribute('x2', `calc(50% + ${t.x || 0}px)`);
                    el.setAttribute('y2', `calc(50% + ${t.y || 0}px)`);
                }
            });
        });

        return () => { sim.stop(); };
    }, [photos, isTagMode, selectedTag, selectedLocation, maxRadius, animationKey]);

    return { simData, simRef };
}
