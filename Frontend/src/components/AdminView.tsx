import { usePhotoStore } from '../store/usePhotoStore';
import { useShallow } from 'zustand/react/shallow';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Calendar, Heart, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Photo } from '../type';

interface AdminViewProps {
  onNavigate: (category: string) => void;
}

export function AdminView({ onNavigate }: AdminViewProps) {
  const photos = usePhotoStore(useShallow(state => state.photos));

  const injectMockData = () => {
    const mockPhotos: Photo[] = Array.from({ length: 1000 }).map((_, i) => ({
      id: `mock-${Date.now()}-${i}`,
      url: 'https://images.unsplash.com/error', 
      title: `Stress Node ${i}`,
      location: `Virtual City`,
      lat: 37.5665 + (Math.random() - 0.5) * 0.5,
      lng: 126.9780 + (Math.random() - 0.5) * 0.5,
      date: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      tags: ['stress', `batch-${Math.floor(i / 100)}`],
      category: 'stress_test',
      isFavorite: false
    }));

    usePhotoStore.setState((state) => ({ 
      photos: [...state.photos, ...mockPhotos] 
    }));
    toast.success('1,000장의 가상 사진 데이터가 프론트엔드 상태에 강제 주입되었습니다!', {
      description: 'NodeView나 PhotoFeed로 이동하여 성능을 테스트해보세요.',
    });
  };

  const clearMockData = () => {
    usePhotoStore.setState((state) => ({
      photos: state.photos.filter(p => !p.id.startsWith('mock-'))
    }));
    toast.info('부하 테스트용 가상 데이터를 모두 삭제했습니다.');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F5F2EB] p-4 md:p-8 overflow-hidden z-20">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Data Admin</h2>
          <p className="text-stone-500 text-sm mt-1">
            업로드된 사진들의 원시 데이터(좌표, 태그 등)와 등록 상태를 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 bg-white/60 hover:bg-rose-50 border-stone-200 text-stone-700"
            onClick={() => onNavigate('favorites')}
          >
            <Heart className="w-4 h-4 text-rose-500" /> 
            Favorites View
          </Button>
          <div className="flex gap-2 bg-stone-100 p-1 rounded-lg">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 h-9"
              onClick={injectMockData}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              부하 테스트 (+1K)
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white hover:bg-red-50 border-stone-200 text-red-500 hover:text-red-600 h-9"
              onClick={clearMockData}
            >
              초기화
            </Button>
          </div>
          <Button 
            variant="outline"  
            className="flex items-center gap-2 bg-white/60 hover:bg-stone-50 border-stone-200 text-stone-700"
            onClick={() => onNavigate('timeline')}
          >
            <Calendar className="w-4 h-4 text-stone-600" />
            Timeline View
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/40 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 p-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/50 hover:bg-stone-50/50">
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {photos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-stone-500">
                    No photos uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                photos.map((photo) => (
                  <TableRow key={photo.id} className="group">
                    <TableCell>
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-stone-100 flex-shrink-0">
                        <ImageWithFallback
                          src={photo.url}
                          alt={photo.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-stone-800 line-clamp-1">{photo.title || 'Untitled'}</div>
                      {photo.description && (
                        <div className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">{photo.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-stone-600 text-xs">
                        {photo.location}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-stone-600">
                      {photo.lat ? photo.lat.toFixed(6) : <span className="text-red-400">N/A</span>}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-stone-600">
                      {photo.lng ? photo.lng.toFixed(6) : <span className="text-red-400">N/A</span>}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-stone-600 whitespace-nowrap">
                        {new Date(photo.date).toLocaleString('ko-KR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {photo.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] bg-[#E09F87]/10 text-[#E09F87] hover:bg-[#E09F87]/20 border-none px-1.5 font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
