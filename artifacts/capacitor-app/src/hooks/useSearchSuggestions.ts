import { useEffect, useRef, useState } from 'react';

export function useSearchSuggestions(query: string): { suggestions: string[]; debugError: string | null } {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [debugError, setDebugError] = useState<string | null>(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    const trimmed = query.trim();
    latestQueryRef.current = trimmed;

    if (!trimmed) {
      setSuggestions([]);
      setDebugError(null);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(trimmed)}&type=list`);
        if (!res.ok) {
          if (latestQueryRef.current === trimmed) setDebugError(`HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        if (latestQueryRef.current !== trimmed) return;
        const list = Array.isArray(data?.[1]) ? data[1] : [];
        setSuggestions(list.slice(0, 6));
        setDebugError(list.length === 0 ? 'Empty result' : null);
      } catch (err: any) {
        if (latestQueryRef.current === trimmed) {
          setSuggestions([]);
          setDebugError(err?.message || 'Fetch failed');
        }
      }
    }, 220);

    return () => clearTimeout(handle);
  }, [query]);

  return { suggestions, debugError };
}
