import { useEffect, useRef, useState } from 'react';

export function useSearchSuggestions(query: string): { suggestions: string[]; debugError: string | null } {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [debugError, setDebugError] = useState<string | null>(null);
  const latestQueryRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    latestQueryRef.current = trimmed;

    if (trimmed.length < 3 || trimmed.includes('://')) {
      setSuggestions([]);
      setDebugError(null);
      return;
    }

    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(trimmed)}&type=list`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          if (latestQueryRef.current === trimmed) setDebugError(`HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        if (latestQueryRef.current !== trimmed) return;
        const list = Array.isArray(data?.[1]) ? data[1] : [];
        setSuggestions(list.slice(0, 6));
        setDebugError(null);
      } catch (err: any) {
        if (latestQueryRef.current === trimmed && err?.name !== 'AbortError') {
          setSuggestions([]);
          setDebugError(err?.message || 'Fetch failed');
        }
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  return { suggestions, debugError };
}
