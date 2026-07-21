import { Sidebar } from './components/Sidebar';
import { PhotoFeed } from './components/PhotoFeed';
import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { Spinner } from './components/ui/spinner';

const LoginView = lazy(() => import('./components/LoginView').then(m => ({ default: m.LoginView })));
const SignupView = lazy(() => import('./components/SignupView').then(m => ({ default: m.SignupView })));
const UploadScreen = lazy(() => import('./components/UploadScreen').then(m => ({ default: m.UploadScreen })));
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
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from './store/useAuthStore';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { ErrorBoundary } from './components/ErrorBoundary';
import { demoUserId, isPublicDemo } from './lib/demoConfig';
import { missingSupabaseEnv } from './lib/supabaseClient';

function MissingConfigScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 text-stone-800">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-3">데모 환경 설정이 필요합니다</h1>
        <p className="text-sm text-stone-600 leading-6">{message}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [shouldRenderGlobe, setShouldRenderGlobe] = useState(false);

  const { user, loading, signOut, isAdmin } = useAuthStore();
  const { photos, initialize, clearPhotos } = usePhotoStore(
    useShallow(state => ({
      photos: state.photos,
      initialize: state.initialize,
      clearPhotos: state.clear,
    }))
  );
  const showPerformanceMonitor = import.meta.env.VITE_SHOW_PERFORMANCE_MONITOR === 'true';

  useEffect(() => {
    const globeDelayId = window.setTimeout(() => setShouldRenderGlobe(true), 4500);
    return () => window.clearTimeout(globeDelayId);
  }, []);
  useEffect(() => {
    if (!isPublicDemo && !loading && activeCategory === 'admin' && !isAdmin) {
      setActiveCategory('all');
    }
  }, [activeCategory, isAdmin, loading]);

  useEffect(() => {
    const targetUserId = isPublicDemo ? demoUserId : user?.id;
    if (!missingSupabaseEnv && targetUserId) {
      initialize(targetUserId);
    }
  }, [user?.id, initialize]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set(photos.map(p => {
      const parts = p.location.split(',');
      return parts[parts.length - 1].trim();
    }));
    return countries.size;
  }, [photos]);

  if (missingSupabaseEnv) {
    return <MissingConfigScreen message="VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 Vercel 환경변수에 등록해 주세요." />;
  }

  if (isPublicDemo && !demoUserId) {
    return <MissingConfigScreen message="로그인 없는 공개 데모를 위해 VITE_DEMO_USER_ID를 Vercel 환경변수에 등록해 주세요." />;
  }

  if (!isPublicDemo && loading) {
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
    if (isPublicDemo) return;
    try {
      await signOut();
      clearPhotos();
      setActiveCategory('all');
    } catch (err) {
      console.error('SignOut error:', err);
    }
  };

  if (!isPublicDemo && !user) {
    return (
      <>
        {activeCategory === 'signup' ? (
          <SignupView onNavigate={setActiveCategory} />
        ) : (
          <LoginView onNavigate={setActiveCategory} />
        )}
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F2EB] text-stone-800 font-sans overflow-hidden selection:bg-[#E09F87] selection:text-white touch-manipulation">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#AECBEB]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E09F87]/15 rounded-full blur-[100px]" />
      </div>

      {showPerformanceMonitor && <PerformanceMonitor />}

      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onSignOut={handleSignOut}
        isAdmin={!isPublicDemo && isAdmin}
        isReadOnlyDemo={isPublicDemo}
        className="flex-shrink-0 md:z-20 z-50"
      />

      <main className="flex-1 relative z-10 flex flex-col md:flex-row overflow-hidden">
        {activeCategory === 'map' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><Map2DView onNavigate={setActiveCategory} isReadOnlyDemo={isPublicDemo} /></Suspense></ErrorBoundary>
          </div>
        ) : activeCategory === 'node' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><NodeView isReadOnlyDemo={isPublicDemo} /></Suspense></ErrorBoundary>
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
            <ErrorBoundary><Suspense fallback={<Spinner />}><AlbumsView isReadOnlyDemo={isPublicDemo} /></Suspense></ErrorBoundary>
          </div>
        ) : !isPublicDemo && activeCategory === 'admin' ? (
          <div className="w-full h-full relative z-20">
            <ErrorBoundary><Suspense fallback={<Spinner />}><AdminView onNavigate={setActiveCategory} /></Suspense></ErrorBoundary>
          </div>
        ) : (
          <>
            <div className="w-full md:w-1/2 h-[35vh] md:h-full flex-shrink-0 flex items-center justify-center relative order-1 md:order-2 bg-gradient-to-b from-transparent to-[#F5F2EB]/50">
              <div className="absolute inset-0 flex items-center justify-center">
                {shouldRenderGlobe ? (
                  <Suspense fallback={<Spinner />}>
                    <GlobeView />
                  </Suspense>
                ) : (
                  <Spinner />
                )}
              </div>
              <div className="absolute top-4 right-4 left-4 md:left-auto bg-white/75 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/50 max-w-none md:max-w-sm md:top-8 md:right-8">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium text-stone-800 text-sm md:text-base">Photomap Public Archive</h2>
                  {isPublicDemo && (
                    <span className="rounded-full border border-stone-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                      읽기 전용
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] md:text-xs leading-5 text-stone-600">
                  여행 사진을 위치, 시간, 관계로 탐색하는 공개 데모입니다.
                </p>
                <p className="mt-2 text-[10px] md:text-xs text-stone-500 tabular-nums">
                  {uniqueCountries} countries · {photos.length} memories
                </p>
              </div>
              {isPublicDemo && (
                <div className="absolute left-4 bottom-4 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-stone-500 border border-stone-200 shadow-sm">
                  읽기 전용 데모
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 flex-1 md:h-full order-2 md:order-1 relative z-10 min-h-0">
              <PhotoFeed className="h-full pb-20 md:pb-10" isReadOnlyDemo={isPublicDemo} />
            </div>
          </>
        )}
      </main>

      {!isPublicDemo && (
        <div className="fixed bottom-20 right-6 z-40 md:hidden">
          <Button
            size="icon"
            aria-label="New Memory"
            className="w-14 h-14 rounded-full bg-[#E09F87] hover:bg-[#D08E76] shadow-xl text-white"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {!isPublicDemo && (
        <div className="fixed bottom-24 right-8 z-40 hidden md:block">
          <Button
            className="bg-[#E09F87] hover:bg-[#D08E76] text-white rounded-full px-6 shadow-lg hover:shadow-xl transition-colors duration-200"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> New Memory
          </Button>
        </div>
      )}

      {!isPublicDemo && isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:p-10 bg-black/20 backdrop-blur-sm">
          <div className="w-full h-full md:w-[480px] md:h-[800px] md:rounded-[40px] overflow-hidden shadow-2xl relative">
            <Suspense fallback={<Spinner />}>
              <UploadScreen onClose={() => setIsUploadOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
