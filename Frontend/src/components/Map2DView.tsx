import { useState, useEffect, useRef } from 'react';
import { Compass, Plus, Minus, Search, X, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import L from 'leaflet';
import { usePhotoContext } from '../context/PhotoContext';

// Leaflet CSS is required for the map to render correctly
const loadLeafletCSS = () => {
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
};

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  location: string;
  category: string;
  image: string;
}

interface Map2DViewProps {
  onNavigate?: (view: string) => void;
}

export function Map2DView({ onNavigate }: Map2DViewProps) {
  const { photos } = usePhotoContext();
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isMapReady, setIsMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  const MARKERS: MapMarker[] = photos
    .filter(p => p.lat !== undefined && p.lng !== undefined)
    .map(p => ({
      id: p.id,
      lat: p.lat!,
      lng: p.lng!,
      title: p.title,
      location: p.location,
      category: p.tags[0] || 'places', // Use first tag as category
      image: p.url
    }));

  const filteredMarkers = activeFilter === 'all'
    ? MARKERS
    : MARKERS.filter(m => m.category === activeFilter);

  // Initialize Map
  useEffect(() => {
    loadLeafletCSS();

    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [36.5, 127.5], // Center of South Korea
      zoom: 7,
      minZoom: 6,
      maxZoom: 18
    });

    // Add OpenStreetMap Tile Layer (CartoDB Voyager for a cleaner look fitting the theme)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 필터 변경 시 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // 기존 마커 제거
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // 새 마커 추가
    filteredMarkers.forEach(marker => {
      // 커스텀 HTML 마커
      const isActive = selectedMarker === marker.id;
      const html = `
        <div class="relative group cursor-pointer transition-all duration-300 ${isActive ? 'z-50 scale-125' : 'z-10 hover:scale-110'}">
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-colors 
            ${isActive ? 'bg-[#E09F87] text-white' : 'bg-white text-[#E09F87] hover:bg-[#E09F87] hover:text-white'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          ${!isActive ? `
          <div class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 font-sans">
            ${marker.location}
          </div>
          ` : ''}
        </div>
      `;

      const icon = L.divIcon({
        html: html,
        className: 'bg-transparent border-none', // 기본 Leaflet 아이콘 스타일 제거
        iconSize: [32, 32],
        iconAnchor: [16, 16] // 아이콘 중앙 정렬
      });

      const leafletMarker = L.marker([marker.lat, marker.lng], { icon })
        .addTo(map)
        .on('click', (e: any) => {
          L.DomEvent.stopPropagation(e); // 맵 클릭 이벤트 전파 방지
          setSelectedMarker(marker.id);
          map.flyTo([marker.lat, marker.lng], 10, { duration: 1.5 });
        });

      markersRef.current[marker.id] = leafletMarker;
    });

    // 맵 클릭 시 마커 선택 해제
    map.on('click', () => {
      setSelectedMarker(null);
    });

  }, [filteredMarkers, selectedMarker]);

  // Handle Zoom
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleReset = () => {
    mapInstanceRef.current?.flyTo([36.5, 127.5], 7, { duration: 1.5 });
    setSelectedMarker(null);
  };

  return (
    <div className="w-full h-full relative bg-[#F5F2EB] overflow-hidden flex flex-col">
      {/* Map Controls / Header */}
      <div className="absolute top-0 left-0 right-0 z-[400] p-4 pt-16 md:p-6 md:pt-6 pointer-events-none">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50 flex items-center gap-2">
            <Search className="w-5 h-5 text-stone-400 ml-2" />
            <input
              type="text"
              placeholder="Search places..."
              className="bg-transparent border-none outline-none text-sm text-stone-700 placeholder:text-stone-400 w-48 md:w-64"
            />
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 md:gap-2 max-w-full justify-start lg:justify-end">
            {['all', 'nature', 'urban', 'culture', 'food'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-3 py-1 md:px-4 md:py-2 rounded-full text-[11px] md:text-xs font-medium capitalize transition-all border shadow-sm",
                  activeFilter === filter
                    ? "bg-[#E09F87] text-white border-[#E09F87]"
                    : "bg-white/90 backdrop-blur-sm text-stone-600 border-white/50 hover:bg-white"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative w-full h-full bg-[#EBE6DA]">
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F5F2EB] z-10">
            <Loader2 className="w-8 h-8 text-[#E09F87] animate-spin" />
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full z-0 outline-none" />
      </div>

      {/* Selected Marker Card Overlay */}
      {selectedMarker && (
        <div
          className="absolute bottom-24 left-6 right-6 md:left-auto md:right-8 md:bottom-28 md:w-80 z-[500] animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          {MARKERS.filter(m => m.id === selectedMarker).map(marker => (
            <div key={marker.id} className="bg-white/95 backdrop-blur-sm rounded-3xl p-4 shadow-xl border border-stone-100 relative overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/20 text-white hover:bg-black/30 w-8 h-8 rounded-full backdrop-blur-sm"
                onClick={() => setSelectedMarker(null)}
              >
                <X className="w-4 h-4" />
              </Button>

              <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-4 relative">
                <ImageWithFallback src={marker.image} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/80 backdrop-blur text-[10px] font-bold uppercase tracking-wider rounded-md">
                  {marker.category}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-stone-800">{marker.title}</h3>
                  <span className="text-xs text-stone-400">{marker.location}</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  A beautiful destination captured in our travel archives. Click to view full details.
                </p>

                <Button
                  className="w-full mt-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 text-xs h-9"
                  onClick={() => onNavigate?.('favorites')}
                >
                  View Details <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zoom Controls */}
      <div className={cn(
        "absolute left-6 md:left-8 flex flex-col gap-2 z-[400] transition-all duration-300",
        selectedMarker ? "bottom-24 md:bottom-28" : "bottom-8"
      )}>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white shadow-lg border-stone-100 hover:bg-stone-50"
          onClick={handleZoomIn}
        >
          <Plus className="w-5 h-5 text-stone-600" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white shadow-lg border-stone-100 hover:bg-stone-50"
          onClick={handleZoomOut}
        >
          <Minus className="w-5 h-5 text-stone-600" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white shadow-lg border-stone-100 hover:bg-stone-50"
          onClick={handleReset}
        >
          <Compass className="w-4 h-4 text-stone-600" />
        </Button>
      </div>
    </div>
  );
}
