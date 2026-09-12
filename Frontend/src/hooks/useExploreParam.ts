import { useCallback, useSyncExternalStore } from 'react';

const changeEvent = 'photomap:navigation';
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(changeEvent, listener);
  };
}

/** Small URL adapter: discrete navigation pushes; typing replaces the current entry. */
export function useExploreParam(
  key: string,
  defaultValue: string,
  options: { history?: 'push' | 'replace'; values?: readonly string[] } = {},
): [string, (value: string) => void] {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => '');
  const rawValue = new URLSearchParams(search).get(key) ?? defaultValue;
  const value = options.values && !options.values.includes(rawValue) ? defaultValue : rawValue;
  const history = options.history ?? 'push';
  const setValue = useCallback((next: string) => {
    const url = new URL(window.location.href);
    if (next === defaultValue) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    if (url.href === window.location.href) return;
    // Preserve unrelated query parameters, hash and existing history metadata.
    window.history[history === 'replace' ? 'replaceState' : 'pushState'](window.history.state, '', url);
    window.dispatchEvent(new Event(changeEvent));
  }, [key, defaultValue, history]);
  return [value, setValue];
}
