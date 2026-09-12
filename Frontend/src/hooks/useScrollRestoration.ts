import { useLayoutEffect, type RefObject } from 'react';

// Session-only UI positions. No photo data or unbounded history in storage.
const positions = new Map<string, number>();
const maxPositions = 50;

export function useScrollRestoration(
  ref: RefObject<HTMLDivElement | null>, key: string, enabled = true,
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const saved = positions.get(key) ?? 0;
    element.scrollTop = saved;
    // Virtual rows settle after their initial measurement.
    const frame = requestAnimationFrame(() => { element.scrollTop = saved; });
    const remember = () => {
      positions.delete(key);
      positions.set(key, element.scrollTop);
      if (positions.size > maxPositions) positions.delete(positions.keys().next().value!);
    };
    element.addEventListener('scroll', remember, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      remember();
      element.removeEventListener('scroll', remember);
    };
  }, [ref, key, enabled]);
}
