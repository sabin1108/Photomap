import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { cn } from './ui/utils';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { usePhotoContext } from '../context/PhotoContext';

interface PhotoFeedProps {
  className?: string; // photos prop 제거됨
}

export function PhotoFeed({ className }: PhotoFeedProps) {
  const { photos } = usePhotoContext();

  return (
    <div className={cn("p-6 md:p-10 h-full overflow-y-auto custom-scrollbar", className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-8"
      >
        <h2 className="text-3xl font-light text-stone-800 mb-2">Recent Memories</h2>
        <div className="h-1 w-20 bg-[#E09F87] rounded-full opacity-60"></div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 bg-stone-100"
          >
            <div className="w-full h-full transition-transform duration-700 group-hover:scale-105">
              <ImageWithFallback
                src={photo.url}
                alt={photo.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* 오버레이 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
              <p className="text-white font-medium text-lg tracking-wide">{photo.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-3 h-3 text-[#E09F87]" />
                <span className="text-white/80 text-xs uppercase tracking-wider">{photo.location}</span>
              </div>
              <p className="text-white/60 text-[10px] mt-2 font-mono">{photo.date}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
