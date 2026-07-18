import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';

export const HOME_URL = 'https://www.google.com';

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return HOME_URL;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/;
  if (domainPattern.test(trimmed) && !trimmed.includes(' ')) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function getDisplayUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
}

interface BrowserRef {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
}

interface BrowserContextType {
  currentUrl: string;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  canGoBack: boolean;
  setCanGoBack: (v: boolean) => void;
  canGoForward: boolean;
  setCanGoForward: (v: boolean) => void;
  pageTitle: string;
  setPageTitle: (t: string) => void;
  browserRef: React.MutableRefObject<BrowserRef | null>;
  history: HistoryEntry[];
  bookmarks: Bookmark[];
  navigate: (url: string) => void;
  addToHistory: (url: string, title: string) => void;
  toggleBookmark: (url: string, title: string) => void;
  isBookmarked: (url: string) => boolean;
  clearHistory: () => void;
  removeHistoryItem: (id: string) => void;
  removeBookmark: (id: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
}

const BrowserContext = createContext<BrowserContextType | null>(null);

const HISTORY_KEY = 'browser_history';
const BOOKMARKS_KEY = 'browser_bookmarks';

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function uid() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState(HOME_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const browserRef = useRef<BrowserRef | null>(null);

  useEffect(() => {
    setHistory(loadStorage<HistoryEntry[]>(HISTORY_KEY, []));
    setBookmarks(loadStorage<Bookmark[]>(BOOKMARKS_KEY, []));
  }, []);

  const navigate = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    setCurrentUrl(normalized);
    setIsLoading(true);
    setCanGoBack(false);
    setCanGoForward(false);
  }, []);

  const addToHistory = useCallback((url: string, title: string) => {
    if (!url) return;
    setHistory((prev) => {
      const entry: HistoryEntry = {
        id: uid(),
        url,
        title: title || getDisplayUrl(url),
        timestamp: Date.now(),
      };
      const filtered = prev.filter((h) => h.url !== url);
      const next = [entry, ...filtered].slice(0, 200);
      saveStorage(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((url: string, title: string) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.url === url);
      const next = exists
        ? prev.filter((b) => b.url !== url)
        : [{ id: uid(), url, title: title || getDisplayUrl(url) }, ...prev];
      saveStorage(BOOKMARKS_KEY, next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (url: string) => bookmarks.some((b) => b.url === url),
    [bookmarks],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      saveStorage(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveStorage(BOOKMARKS_KEY, next);
      return next;
    });
  }, []);

  const goBack = useCallback(() => browserRef.current?.goBack(), []);
  const goForward = useCallback(() => browserRef.current?.goForward(), []);
  const reload = useCallback(() => browserRef.current?.reload(), []);

  return (
    <BrowserContext.Provider
      value={{
        currentUrl,
        isLoading,
        setIsLoading,
        canGoBack,
        setCanGoBack,
        canGoForward,
        setCanGoForward,
        pageTitle,
        setPageTitle,
        browserRef,
        history,
        bookmarks,
        navigate,
        addToHistory,
        toggleBookmark,
        isBookmarked,
        clearHistory,
        removeHistoryItem,
        removeBookmark,
        goBack,
        goForward,
        reload,
      }}
    >
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowser() {
  const ctx = useContext(BrowserContext);
  if (!ctx) throw new Error('useBrowser must be used within BrowserProvider');
  return ctx;
}
