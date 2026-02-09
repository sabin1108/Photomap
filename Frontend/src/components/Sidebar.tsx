import { Compass, Map, Heart, Calendar, Settings, Image as ImageIcon, Menu, LogOut } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { useState } from 'react';

interface SidebarProps {
  className?: string;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onSignOut: () => void;
}

export function Sidebar({ className, activeCategory, onSelectCategory, onSignOut }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const categories = [
    { id: 'all', icon: Compass, label: 'Explore' },
    { id: 'map', icon: Map, label: 'Map View' },
    { id: 'favorites', icon: Heart, label: 'Favorites' },
    { id: 'timeline', icon: Calendar, label: 'Timeline' },
    { id: 'albums', icon: ImageIcon, label: 'Albums' },
  ];

  return (
    <>
      {/* 모바일 토글 */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-white/50 backdrop-blur-md hover:bg-white/70">
          <Menu className="w-6 h-6 text-stone-700" />
        </Button>
      </div>

      {/* 사이드바 */}
      <div className={cn(
        "fixed md:relative h-full z-40 transition-transform duration-300 ease-in-out",
        "w-64 bg-white/40 backdrop-blur-2xl border-r border-white/20 shadow-xl md:shadow-none",
        "flex flex-col py-8 px-4",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        className
      )}>
        <div className="mb-10 px-4">
          <h1 className="text-2xl font-light tracking-wider text-stone-800">
            TRAVEL<span className="font-semibold text-terracotta-500">ARC</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">Digital Archive</p>
        </div>

        <nav className="flex-1 space-y-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => {
                  onSelectCategory(category.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-white/60 shadow-sm text-stone-900"
                    : "text-stone-500 hover:bg-white/30 hover:text-stone-800"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-[#E09F87]" : "text-stone-400 group-hover:text-stone-600"
                )} strokeWidth={1.5} />
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-4 space-y-2">
          <button className="flex items-center gap-3 text-stone-500 hover:text-stone-800 transition-colors w-full">
            <Settings className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-sm font-medium">Settings</span>
          </button>

          <button
            onClick={onSignOut}
            className="flex items-center gap-3 text-stone-500 hover:text-red-500 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </div>

      {/* 모바일용 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
