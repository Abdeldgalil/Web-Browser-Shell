import { useEffect, useRef, useState } from 'react';

export function useSearchSuggestions(query: string): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const latestQueryRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    latestQueryRef.current = trimmed;

    // Only fetch for real search-like input (3+ characters, not a URL),
    // and wait a bit longer between keystrokes — a previous, more
    // aggressive version triggered Google's automated-traffic protection.
    if (trimmed.length < 3 || trimmed.includes('://') || trimmed.includes('.')) {
      setSuggestions([]);
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
        if (!res.ok) return;
        const data = await res.json();
        if (latestQueryRef.current !== trimmed) return;
        const list = Array.isArray(data?.[1]) ? data[1] : [];
        setSuggestions(list.slice(0, 6));
      } catch {
        // aborted or network error — silently ignore
      }
    }, 450);

    return () => clearTimeout(handle);
  }, [query]);

  return suggestions;
}
