import { useMemo, useRef } from 'react';
import { Calendar, MapPin, ArrowRight, Filter } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import { usePhotoStore } from '../store/usePhotoStore';

interface TimelineEvent {
  id: string;
  date: string;
  year: number;
  month: string;
  title: string;
  location: string;
  description: string;
  images: string[];
}

export function TimelineView() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const photos = usePhotoStore(state => state.photos);

  // 필요한 필드만 추출 — photos가 바뀔 때만 재계산 (useMemo)
  const timelineData: TimelineEvent[] = useMemo(() => {
    return photos.map(photo => {
      const dateDate = new Date(photo.date);
      const year = isNaN(dateDate.getFullYear()) ? new Date().getFullYear() : dateDate.getFullYear();
      const month = isNaN(dateDate.getMonth()) ? 'Recent' : dateDate.toLocaleString('default', { month: 'long' });
      return {
        id: photo.id,
        date: photo.date,
        year,
        month,
        title: photo.title,
        location: photo.location,
        description: photo.description || '',
        images: [photo.url],
      };
    });
  }, [photos]);

  const years = Array.from(new Set(timelineData.map(d => d.year))).sort((a, b) => b - a);

  return (
    <div className="w-full h-full bg-[#F5F2EB] flex flex-col relative overflow-hidden">
      <div className="flex-none px-6 pt-16 pb-6 md:px-10 md:py-8 flex items-end justify-between z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-stone-800 tracking-tight">
            Journey <span className="font-serif italic text-[#E09F87]">Timeline</span>
          </h1>
          <p className="text-stone-500 mt-2 max-w-md text-sm md:text-base">
            Tracing back the footsteps of past adventures, arranged chronologically.
          </p>
        </div>

        <div className="hidden md:flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full border-stone-200 text-stone-600 hover:bg-stone-100">
            <Filter className="w-4 h-4 mr-2" />
            Filter Date
          </Button>
          <Button variant="outline" size="sm" className="rounded-full border-stone-200 text-stone-600 hover:bg-stone-100">
            Newest First
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-10 pb-20 scrollbar-hide"
      >
        <div className="max-w-4xl mx-auto relative min-h-[500px]">
          {/* 중앙 구분선 */}
          <div className="absolute left-[20px] md:left-1/2 top-4 bottom-0 w-px bg-gradient-to-b from-[#E09F87] via-stone-300 to-transparent md:-translate-x-1/2" />

          <div className="space-y-12 md:space-y-24 py-8">
            {years.map((year) => {
              const yearEvents = timelineData.filter(e => e.year === year);

              return (
                <div key={year} className="relative">
                  {/* 연도 표시기 */}
                  <div className="flex items-center md:justify-center mb-8 md:mb-12 relative">
                    <div className="bg-[#E09F87] text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-widest shadow-lg z-10 border-4 border-[#F5F2EB]">
                      {year}
                    </div>
                  </div>

                  {/* 이벤트 목록 */}
                  <div className="space-y-12">
                    {yearEvents.map((event, idx) => {
                      const isLeft = idx % 2 === 0;

                      return (
                        <div key={event.id} className={cn(
                          "relative flex flex-col md:flex-row items-start",
                          isLeft ? "md:flex-row-reverse" : ""
                        )}>
                          {/* 타임라인 포인트 */}
                          <div className="absolute left-[20px] md:left-1/2 w-4 h-4 bg-white border-4 border-[#E09F87] rounded-full translate-y-6 md:-translate-x-1/2 z-10" />

                          {/* 데스크탑용 콘텐츠 스페이서 (반대편 여백) */}
                          <div className="hidden md:block md:w-1/2" />

                          {/* 카드 콘텐츠 */}
                          <div className={cn(
                            "pl-12 md:pl-0 w-full md:w-1/2",
                            isLeft ? "md:pr-12 md:text-right" : "md:pl-12"
                          )}>
                            <div className={cn(
                              "bg-white p-5 rounded-3xl shadow-sm border border-white/60 hover:shadow-md transition-all duration-300 group cursor-pointer",
                              "flex flex-col gap-4",
                              isLeft ? "items-start md:items-end" : "items-start"
                            )}>

                              {/* 날짜 및 장소 태그 */}
                              <div className="flex items-center gap-3 text-xs font-medium text-[#E09F87] uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {event.month}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-stone-300" />
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {event.location}
                                </span>
                              </div>

                              {/* 메인 콘텐츠 */}
                              <div>
                                <h3 className="text-xl font-semibold text-stone-800 mb-2 group-hover:text-[#E09F87] transition-colors">{event.title}</h3>
                                <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">
                                  {event.description}
                                </p>
                              </div>

                              {/* 이미지 그리드 */}
                              {event.images.length > 0 && (
                                <>
                                  {/* 모바일: 캐러셀 */}
                                  <div className="block sm:hidden w-full mt-2">
                                    <Carousel className="w-full relative" opts={{ align: "start", loop: true }}>
                                      <CarouselContent>
                                        {event.images.map((img, i) => (
                                          <CarouselItem key={i}>
                                            <div className="rounded-xl overflow-hidden aspect-[4/3] relative w-full">
                                              <ImageWithFallback src={img} className="w-full h-full object-cover" />
                                            </div>
                                          </CarouselItem>
                                        ))}
                                      </CarouselContent>
                                      {event.images.length > 1 && (
                                        <>
                                          <CarouselPrevious className="left-2 bg-white/70 hover:bg-white border-transparent shadow-sm h-8 w-8" />
                                          <CarouselNext className="right-2 bg-white/70 hover:bg-white border-transparent shadow-sm h-8 w-8" />
                                        </>
                                      )}
                                    </Carousel>
                                  </div>

                                  {/* 데스크탑: 그리드 */}
                                  <div className={cn(
                                    "hidden sm:grid gap-2 w-full mt-2",
                                    event.images.length > 1 ? "grid-cols-2" : "grid-cols-1"
                                  )}>
                                    {event.images.map((img, i) => (
                                      <div key={i} className="rounded-xl overflow-hidden aspect-[4/3] relative">
                                        <ImageWithFallback src={img} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}

                              <div className="mt-2">
                                <Button variant="ghost" size="sm" className="text-stone-400 hover:text-stone-800 p-0 h-auto font-normal text-xs">
                                  View Album <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 종료 표시기 */}
          <div className="flex justify-center pb-10">
            <div className="w-3 h-3 bg-stone-300 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
