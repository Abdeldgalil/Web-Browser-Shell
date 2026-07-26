import { useEffect, useRef, useState } from 'react';

export function useSearchSuggestions(query: string): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const latestQueryRef = useRef('');

  useEffect(() => {
    const trimmed = query.trim();
    latestQueryRef.current = trimmed;

    if (!trimmed || trimmed.includes('://') || trimmed.includes(' ') === false && trimmed.includes('.')) {
      setSuggestions([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        if (latestQueryRef.current !== trimmed) return;
        setSuggestions(Array.isArray(data?.[1]) ? data[1].slice(0, 6) : []);
      } catch {
        if (latestQueryRef.current === trimmed) setSuggestions([]);
      }
    }, 220);

    return () => clearTimeout(handle);
  }, [query]);

  return suggestions;
}
