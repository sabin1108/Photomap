import { Sidebar } from './components/Sidebar';
import { PhotoFeed } from './components/PhotoFeed';
import { UploadScreen } from './components/UploadScreen';
import { LoginView } from './components/LoginView';
import { SignupView } from './components/SignupView';
import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { Spinner } from './components/ui/spinner';

const GlobeView = lazy(() => import('./components/GlobeView').then(m => ({ default: m.GlobeView })));
const Map2DView = lazy(() => import('./components/Map2DView').then(m => ({ default: m.Map2DView })));
const TimelineView = lazy(() => import('./components/TimelineView').then(m => ({ default: m.TimelineView })));
const FavoritesView = lazy(() => import('./components/FavoritesView').then(m => ({ default: m.FavoritesView })));
const AlbumsView = lazy(() => import('./components/AlbumsView').then(m => ({ default: m.AlbumsView })));
const NodeView = lazy(() => import('./components/node').then(m => ({ default: m.NodeView })));
const AdminView = lazy(() => import('./components/AdminView').then(m => ({ default: m.AdminView })));
import { Plus } from 'lucide-react';
import { Button } from './components/ui/button';
import { usePhotoStore } from './store/usePhotoStore';
import { useAuthStore } from './store/useAuthStore';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { user, loading, signOut, isAdmin } = useAuthStore();
  const photos = usePhotoStore(state => state.photos);
  const initialize = usePhotoStore(state => state.initialize);

  useEffect(() => {
    // 만약 관리자가 아닌데 관리자 페이지에 머물러 있다면 메인으로 튕겨냄
    if (!loading && activeCategory === 'admin' && !isAdmin) {
      setActiveCategory('all');
    }
  }, [activeCategory, isAdmin, loading]);

  useEffect(() => {
    if (user?.id) {
      initialize(user.id);
    }
  }, [user?.id, initialize]);

  const uniqueCountries = useMemo(() => {
    // "City, Country" 형식의 위치 문자열을 가정합니다.
    const countries = new Set(photos.map(p => {
      const parts = p.location.split(',');
      return parts[parts.length - 1].trim();
    }));
    return countries.size;
  }, [photos]);

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F5F2EB] text-stone-800 font-sans overflow-hidden">
        <div className="w-20 md:w-64 border-r border-stone-200 bg-white/50 animate-pulse" />
        <main className="flex-1 p-10 space-y-8">
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <div className="w-48 h-10 bg-stone-200 rounded-lg animate-pulse" />
              <div className="w-20 h-1.5 bg-[#E09F87]/20 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-stone-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      setActiveCategory('all');
    } catch (err) {
      console.error('SignOut error:', err);
      // 필요 시 파일 상단에서 toast 임포트
    }
  };

  if (!user) {
    if (activeCategory === 'signup') {
      return <SignupView onNavigate={setActiveCategory} />;
    }
    return <LoginView onNavigate={setActiveCategory} />;
  }

  return (
    <div className="flex h-screen bg-[#F5F2EB] text-stone-800 font-sans overflow-hidden selection:bg-[#E09F87] selection:text-white touch-manipulation">
      {/* '따뜻한 감성'을 위한 배경 그라디언트 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#AECBEB]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E09F87]/15 rounded-full blur-[100px]" />
      </div>

      <PerformanceMonitor />

      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onSignOut={handleSignOut}
        isAdmin={isAdmin}
        className="flex-shrink-0 md:z-20 z-50"
      />

      <main className="flex-1 relative z-10 flex flex-col md:flex-row overflow-hidden">
        {/* activeCategory에 따른 조건부 렌더링 */}
        {activeCategory === 'map' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><Map2DView onNavigate={setActiveCategory} /></Suspense></ErrorBoundary>
          </div>
        ) : activeCategory === 'node' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><NodeView /></Suspense></ErrorBoundary>
          </div>
        ) : activeCategory === 'timeline' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><TimelineView /></Suspense></ErrorBoundary>
          </div>
        ) : activeCategory === 'favorites' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><FavoritesView /></Suspense></ErrorBoundary>
          </div>
        ) : activeCategory === 'albums' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><AlbumsView /></Suspense></ErrorBoundary>
          </div>
        ) : activeCategory === 'admin' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><AdminView onNavigate={setActiveCategory} /></Suspense></ErrorBoundary>
          </div>
        ) : (
          <>
            {/* 지구본 섹션 - 데스크탑에서는 고정된 느낌 */}
            <div className="w-full md:w-1/2 h-[35vh] md:h-full flex-shrink-0 flex items-center justify-center relative order-1 md:order-2 bg-gradient-to-b from-transparent to-[#F5F2EB]/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <Suspense fallback={<Spinner />}>
                  <GlobeView />
                </Suspense>
              </div>
              {/* 플로팅 정보 카드 */}
              <div className="absolute top-4 right-4 bg-white/60 backdrop-blur-md p-3 rounded-xl shadow-sm border border-white/40 max-w-[200px] md:max-w-xs md:top-8 md:right-8">
                <h3 className="font-medium text-stone-800 text-sm md:text-base text-balance">Global Archive</h3>
                <p className="text-[10px] md:text-xs text-stone-500 mt-0.5 tabular-nums w-full truncate">
                  {uniqueCountries} Countries visited. {photos.length} Memories stored.
                </p>
              </div>
            </div>

            {/* 사진 피드 섹션 */}
            <div className="w-full md:w-1/2 flex-1 md:h-full order-2 md:order-1 relative z-10 min-h-0">
              <PhotoFeed className="h-full pb-20 md:pb-10" />
            </div>
          </>
        )}
      </main>

      {/* 업로드를 위한 플로팅 버튼 (모바일) */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <Button
          size="icon"
          aria-label="New Memory"
          className="w-14 h-14 rounded-full bg-[#E09F87] hover:bg-[#D08E76] shadow-xl text-white"
          onClick={() => setIsUploadOpen(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* 업로드 버튼 (데스크탑) */}
      <div className="fixed bottom-8 right-8 z-40 hidden md:block">
        <Button
          className="bg-[#E09F87] hover:bg-[#D08E76] text-white rounded-full px-6 shadow-lg hover:shadow-xl transition-colors duration-200"
          onClick={() => setIsUploadOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> New Memory
        </Button>
      </div>

      {/* 업로드 화면 모달 */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:p-10 bg-black/20 backdrop-blur-sm">
          <div className="w-full h-full md:w-[480px] md:h-[800px] md:rounded-[40px] overflow-hidden shadow-2xl relative">
            <UploadScreen onClose={() => setIsUploadOpen(false)} />
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
