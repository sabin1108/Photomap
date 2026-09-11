import { Search, X } from 'lucide-react';
import { cn } from './utils';

interface PhotoSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}

export function PhotoSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className
}: PhotoSearchProps) {
  const hasValue = value.length > 0;

  return (
    <div
      className={cn(
        'flex h-10 w-full items-center gap-2 rounded-2xl border border-white/50 bg-white/90 px-3 text-stone-800 shadow-sm backdrop-blur-md transition-[border-color,box-shadow] focus-within:border-[#E09F87]/50 focus-within:ring-1 focus-within:ring-[#E09F87]',
        className
      )}
    >
      <Search className="h-4 w-4 flex-shrink-0 text-stone-400" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 border-none bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="검색어 지우기"
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E09F87]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}