import { usePhotoContext } from '../context/PhotoContext';
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
import { Calendar, Heart } from 'lucide-react';

interface AdminViewProps {
  onNavigate: (category: string) => void;
}

export function AdminView({ onNavigate }: AdminViewProps) {
  const { photos } = usePhotoContext();

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
