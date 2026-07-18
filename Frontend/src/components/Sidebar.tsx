import { Compass, Map, Image as ImageIcon, Menu, LogOut, Network, Database } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { Sidebar as SidebarUI } from './ui/sidebar';

interface SidebarProps {
  className?: string;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onSignOut: () => void;
  isAdmin?: boolean;
  isReadOnlyDemo?: boolean;
}

export function Sidebar({ className, activeCategory, onSelectCategory, onSignOut, isAdmin, isReadOnlyDemo }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (category: string) => {
    onSelectCategory(category);
    setIsOpen(false);
  };

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="ghost" size="icon" aria-label="메뉴 열기" onClick={() => setIsOpen(!isOpen)} className="bg-white/50 backdrop-blur-md hover:bg-white/70 shadow-sm border border-stone-200">
          <Menu className="w-5 h-5 text-stone-700" />
        </Button>
      </div>

      <SidebarUI.Root isOpen={isOpen} setIsOpen={setIsOpen} className={className}>
        <SidebarUI.Header title="TRAVELARC" subtitle="Digital Archive" />

        <SidebarUI.Nav>
          <SidebarUI.Item
            icon={Compass}
            label="전체 사진"
            isActive={activeCategory === 'all'}
            onClick={() => handleSelect('all')}
          />
          <SidebarUI.Item
            icon={Map}
            label="지도"
            isActive={activeCategory === 'map'}
            onClick={() => handleSelect('map')}
          />
          <SidebarUI.Item
            icon={Network}
            label="관계 보기"
            isActive={activeCategory === 'node'}
            onClick={() => handleSelect('node')}
          />
          <SidebarUI.Item
            icon={ImageIcon}
            label="앨범"
            isActive={activeCategory === 'albums'}
            onClick={() => handleSelect('albums')}
          />
        </SidebarUI.Nav>

        <SidebarUI.Footer>
          {isReadOnlyDemo && (
            <div className="px-3 py-2">
              <p className="text-[11px] font-semibold text-stone-500">읽기 전용 데모</p>
              <p className="mt-0.5 text-[10px] leading-4 text-stone-400">사진 아카이브 탐색만 가능합니다. 업로드와 관리 도구는 숨겨져 있습니다.</p>
            </div>
          )}
          {isAdmin && (
            <SidebarUI.Item
              icon={Database}
              label="데이터 관리"
              isActive={activeCategory === 'admin'}
              onClick={() => handleSelect('admin')}
            />
          )}
          {!isReadOnlyDemo && (
            <SidebarUI.Item
              icon={LogOut}
              label="로그아웃"
              onClick={onSignOut}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-2"
            />
          )}
        </SidebarUI.Footer>
      </SidebarUI.Root>
    </>
  );
}
