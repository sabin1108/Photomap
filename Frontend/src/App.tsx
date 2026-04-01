import { Sidebar } from './components/Sidebar';
import { GlobeView } from './components/GlobeView';
import { PhotoFeed } from './components/PhotoFeed';
import { UploadScreen } from './components/UploadScreen';
import { Map2DView } from './components/Map2DView';
import { TimelineView } from './components/TimelineView';
import { FavoritesView } from './components/FavoritesView';
import { AlbumsView } from './components/AlbumsView';
import { LoginView } from './components/LoginView';
import { SignupView } from './components/SignupView';
import { NodeView } from './components/node';
import { AdminView } from './components/AdminView';
import { useState, useMemo } from 'react';
import { Toaster } from './components/ui/sonner';
import { Plus } from 'lucide-react';
import { Button } from './components/ui/button';
import { usePhotoContext } from './context/PhotoContext';
import { useAuth } from './context/AuthContext';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { user, loading, signOut } = useAuth();
  const { photos } = usePhotoContext();

  const uniqueCountries = useMemo(() => {
    // "City, Country" 형식의 위치 문자열을 가정합니다.
    const countries = new Set(photos.map(p => {
      const parts = p.location.split(',');
      return parts[parts.length - 1].trim();
    }));
    return countries.size;
  }, [photos]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[#F5F2EB]">Loading...</div>;
  }

  if (!user) {
    if (activeCategory === 'signup') {
      return <SignupView onNavigate={setActiveCategory} />;
    }
    return <LoginView onNavigate={setActiveCategory} />;
  }

  return (
    <div className="flex h-screen bg-[#F5F2EB] text-stone-800 font-sans overflow-hidden selection:bg-[#E09F87] selection:text-white">
      {/* '따뜻한 감성'을 위한 배경 그라디언트 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#AECBEB]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E09F87]/15 rounded-full blur-[100px]" />
      </div>

      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onSignOut={signOut}
        className="flex-shrink-0 md:z-20 z-50"
      />

      <main className="flex-1 relative z-10 flex flex-col md:flex-row overflow-hidden">
        {/* activeCategory에 따른 조건부 렌더링 */}
        {activeCategory === 'map' ? (
          <div className="w-full h-full relative z-20">
            <Map2DView onNavigate={setActiveCategory} />
          </div>
        ) : activeCategory === 'node' ? (
          <div className="w-full h-full relative z-20">
            <NodeView />
          </div>
        ) : activeCategory === 'timeline' ? (
          <div className="w-full h-full relative z-20">
            <TimelineView />
          </div>
        ) : activeCategory === 'favorites' ? (
          <div className="w-full h-full relative z-20">
            <FavoritesView />
          </div>
        ) : activeCategory === 'albums' ? (
          <div className="w-full h-full relative z-20">
            <AlbumsView />
          </div>
        ) : activeCategory === 'admin' ? (
          <div className="w-full h-full relative z-20">
            <AdminView onNavigate={setActiveCategory} />
          </div>
        ) : (
          <>
            {/* 지구본 섹션 - 데스크탑에서는 고정된 느낌 */}
            <div className="w-full md:w-1/2 h-[35vh] md:h-full flex-shrink-0 flex items-center justify-center relative order-1 md:order-2 bg-gradient-to-b from-transparent to-[#F5F2EB]/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <GlobeView />
              </div>
              {/* 플로팅 정보 카드 */}
              <div className="absolute top-4 right-4 bg-white/60 backdrop-blur-md p-3 rounded-xl shadow-sm border border-white/40 max-w-[200px] md:max-w-xs md:top-8 md:right-8">
                <h3 className="font-medium text-stone-800 text-sm md:text-base">Global Archive</h3>
                <p className="text-[10px] md:text-xs text-stone-500 mt-0.5">
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
          className="w-14 h-14 rounded-full bg-[#E09F87] hover:bg-[#D08E76] shadow-xl text-white"
          onClick={() => setIsUploadOpen(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* 업로드 버튼 (데스크탑) */}
      <div className="fixed bottom-8 right-8 z-40 hidden md:block">
        <Button
          className="bg-[#E09F87] hover:bg-[#D08E76] text-white rounded-full px-6 shadow-lg hover:shadow-xl transition-all"
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
