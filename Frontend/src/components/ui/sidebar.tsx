import React from 'react';
import { cn } from './utils';

// Context to share isOpen state if needed inside items
const SidebarContext = React.createContext<{ isOpen: boolean; setIsOpen: (o: boolean) => void }>({
  isOpen: false,
  setIsOpen: () => { },
});

export function Root({
  isOpen,
  setIsOpen,
  children,
  className
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-30 md:hidden overscroll-contain"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 데스크탑 사이드바 기본 레이아웃 */}
      <div className={cn(
        "fixed md:relative h-full z-40 transition-transform duration-300 ease-in-out",
        "w-64 bg-[#fcfbfa]/80 backdrop-blur-2xl border-r border-[#e09f87]/10 shadow-xl md:shadow-none flex-shrink-0",
        "flex flex-col py-8 px-4",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        className
      )}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-10 px-4">
      <h1 className="text-2xl font-light tracking-wider text-stone-800">
        {/* TRAVELARC 부분 하이라이트 처리는 재사용 가능하도록 수정 */}
        {title.includes('ARC') ? (
          <>
            {title.split('ARC')[0]}<span className="font-semibold text-[#E09F87]">ARC</span>
          </>
        ) : title}
      </h1>
      {subtitle && <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-widest">{subtitle}</p>}
    </div>
  );
}

export function Nav({ children }: { children: React.ReactNode }) {
  return (
    <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
      {children}
    </nav>
  );
}

export function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto px-2 pt-6 space-y-1 border-t border-stone-200/50">
      {children}
    </div>
  );
}

interface ItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
}

export function Item({ icon: Icon, label, isActive, className, ...props }: ItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors duration-200 group text-left",
        isActive
          ? "bg-white shadow-sm ring-1 ring-stone-900/5 text-stone-900"
          : "text-stone-500 hover:bg-stone-100/50 hover:text-stone-800",
        className
      )}
      {...props}
    >
      <Icon className={cn(
        "w-[18px] h-[18px] transition-colors flex-shrink-0",
        isActive ? "text-[#E09F87]" : "text-stone-400 group-hover:text-stone-600",
        className?.includes('text-red') && !isActive ? 'text-red-400' : ''
      )} strokeWidth={1.5} />
      <span className="text-sm font-medium tracking-wide flex-1">{label}</span>
    </button>
  );
}

export const Sidebar = {
  Root,
  Header,
  Nav,
  Footer,
  Item
};
