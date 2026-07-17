import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const parsed = new URL(url);
    return parsed.hostname;
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
  webViewRef: React.MutableRefObject<any>;
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

const HISTORY_KEY = '@browser_history';
const BOOKMARKS_KEY = '@browser_bookmarks';

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState(HOME_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((val) => {
      if (val) setHistory(JSON.parse(val));
    });
    AsyncStorage.getItem(BOOKMARKS_KEY).then((val) => {
      if (val) setBookmarks(JSON.parse(val));
    });
  }, []);

  const navigate = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    setCurrentUrl(normalized);
    setCanGoBack(false);
    setCanGoForward(false);
  }, []);

  const addToHistory = useCallback((url: string, title: string) => {
    if (!url || url === HOME_URL) return;
    setHistory((prev) => {
      const entry: HistoryEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        url,
        title: title || getDisplayUrl(url),
        timestamp: Date.now(),
      };
      const filtered = prev.filter((h) => h.url !== url);
      const next = [entry, ...filtered].slice(0, 200);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((url: string, title: string) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.url === url);
      let next: Bookmark[];
      if (exists) {
        next = prev.filter((b) => b.url !== url);
      } else {
        next = [
          {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            url,
            title: title || getDisplayUrl(url),
          },
          ...prev,
        ];
      }
      AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (url: string) => bookmarks.some((b) => b.url === url),
    [bookmarks]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const goBack = useCallback(() => webViewRef.current?.goBack(), []);
  const goForward = useCallback(() => webViewRef.current?.goForward(), []);
  const reload = useCallback(() => webViewRef.current?.reload(), []);

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
        webViewRef,
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
