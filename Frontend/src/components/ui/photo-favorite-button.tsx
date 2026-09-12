import { Heart } from 'lucide-react';
import type { Photo } from '../../type';
import { usePhotoStore } from '../../store/usePhotoStore';
import { Button } from './button';
import { cn } from './utils';

export function PhotoFavoriteButton({ photo }: { photo: Photo | null }) {
  const toggleFavorite = usePhotoStore(state => state.toggleFavorite);
  return (
    <Button
      variant="outline"
      disabled={!photo}
      aria-pressed={photo?.isFavorite ?? false}
      className={cn('flex-1 h-12 rounded-xl gap-2', photo?.isFavorite && 'bg-rose-50 border-rose-200 text-rose-600')}
      onClick={() => { if (photo) toggleFavorite(photo.id); }}
    >
      <Heart size={18} aria-hidden="true" className={photo?.isFavorite ? 'fill-current' : ''} />
      {photo?.isFavorite ? '좋아요 취소' : '좋아요'}
    </Button>
  );
}
