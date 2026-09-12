import { Heart, RotateCcw } from 'lucide-react';
import { PhotoFeed } from './PhotoFeed';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { usePhotoStore } from '../store/usePhotoStore';
import { isPublicDemo } from '../lib/demoConfig';
import { useExploreParam } from '../hooks/useExploreParam';
import { useShallow } from 'zustand/react/shallow';

export function FavoritesView() {
  const { photos, categories } = usePhotoStore(
    useShallow(state => ({
      photos: state.photos,
      categories: state.categories,
    })),
  );
  const [activeTab, setActiveTab] = useExploreParam('favoriteTag', 'all');
  const [, setActiveView] = useExploreParam('view', 'all', {
    values: ['all', 'map', 'node', 'timeline', 'favorites', 'albums', 'admin', 'signup', 'login'],
  });

  const favoriteCount = photos.filter(photo => photo.isFavorite).length;
  const tabs = ['all', ...categories];
  const activeFavoriteCount = photos.filter(photo => (
    photo.isFavorite &&
    (activeTab === 'all' || photo.category === activeTab || photo.tags.includes(activeTab))
  )).length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#F5F2EB]">
      <div className="flex-none px-6 pb-4 pt-16 md:px-10 md:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-light tracking-tight text-stone-800 md:text-4xl">좋아요</h1>
              <Heart className="h-6 w-6 fill-[#E09F87] text-[#E09F87]" aria-hidden="true" />
              <span className="rounded-full border border-stone-200 bg-white/70 px-2.5 py-1 text-xs font-medium text-stone-500">
                {favoriteCount}장
              </span>
            </div>
            {isPublicDemo && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                공개 데모의 좋아요는 이 브라우저에만 저장됩니다.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tabs.map(tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-stone-800 bg-stone-800 text-white'
                      : 'border-stone-200 bg-white/80 text-stone-600 hover:bg-stone-50 hover:text-stone-900',
                  )}
                >
                  {tab === 'all' ? '전체' : tab}
                </button>
              );
            })}
          </div>
        </div>

        {(activeTab !== 'all' || favoriteCount === 0 || activeFavoriteCount === 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-500">
            {activeTab !== 'all' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={() => setActiveTab('all')}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                필터 지우기
              </Button>
            )}
            {(favoriteCount === 0 || activeFavoriteCount === 0) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setActiveView('all')}
              >
                전체 사진 보기
              </Button>
            )}
          </div>
        )}
      </div>

      <PhotoFeed
        className="h-full px-4 pb-20 pt-0 md:px-10 md:pb-10"
        filterCategory={activeTab === 'all' ? undefined : activeTab}
        favoritesOnly
        hideHeader
        isReadOnlyDemo={isPublicDemo}
      />
    </div>
  );
}
