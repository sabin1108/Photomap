import { cn } from "./utils";
import { Loader2 } from "lucide-react";

export function Spinner({ className, size = 32 }: { className?: string, size?: number }) {
  return (
    <div className={cn("flex flex-col items-center justify-center w-full h-full min-h-[200px] text-[#E09F87]", className)}>
        <Loader2 size={size} className="animate-spin mb-4" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#E09F87]/70 animate-pulse">Loading Workspace</p>
    </div>
  );
}
