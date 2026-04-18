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
}

export function Sidebar({ className, activeCategory, onSelectCategory, onSignOut, isAdmin }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (category: string) => {
    onSelectCategory(category);
    setIsOpen(false);
  };

  return (
    <>
      {/* 모바일 토글 버튼 */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="ghost" size="icon" aria-label="Toggle Menu" onClick={() => setIsOpen(!isOpen)} className="bg-white/50 backdrop-blur-md hover:bg-white/70 shadow-sm border border-stone-200">
          <Menu className="w-5 h-5 text-stone-700" />
        </Button>
      </div>

      <SidebarUI.Root isOpen={isOpen} setIsOpen={setIsOpen} className={className}>
        <SidebarUI.Header title="TRAVELARC" subtitle="Digital Archive" />

        <SidebarUI.Nav>
          <SidebarUI.Item
            icon={Compass}
            label="Explore"
            isActive={activeCategory === 'all'}
            onClick={() => handleSelect('all')}
          />
          <SidebarUI.Item
            icon={Map}
            label="Map View"
            isActive={activeCategory === 'map'}
            onClick={() => handleSelect('map')}
          />
          <SidebarUI.Item
            icon={Network}
            label="Spatial Node"
            isActive={activeCategory === 'node'}
            onClick={() => handleSelect('node')}
          />
          <SidebarUI.Item
            icon={ImageIcon}
            label="Albums"
            isActive={activeCategory === 'albums'}
            onClick={() => handleSelect('albums')}
          />
        </SidebarUI.Nav>

        <SidebarUI.Footer>
          {isAdmin && (
            <SidebarUI.Item
              icon={Database}
              label="Data Admin"
              isActive={activeCategory === 'admin'}
              onClick={() => handleSelect('admin')}
            />
          )}
          <SidebarUI.Item
            icon={LogOut}
            label="Log Out"
            onClick={onSignOut}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-2"
          />
        </SidebarUI.Footer>
      </SidebarUI.Root>
    </>
  );
}
