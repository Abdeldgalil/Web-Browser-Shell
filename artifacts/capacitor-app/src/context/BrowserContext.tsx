import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Preferences } from '@capacitor/preferences';

// Sentinel value for the app's own home/start page (not a real URL).
export const HOME_URL = 'app://home';

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return HOME_URL;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/;
  if (domainPattern.test(trimmed) && !trimmed.includes(' ')) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function getDisplayUrl(url: string): string {
  if (!url || url === HOME_URL) return '';
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

// Populated by the embedded-browser controller in App.tsx once the native
// InAppBrowser WebView is opened.
export interface EmbeddedBrowserHandle {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  findInPage: (term: string) => void;
  toggleDesktopSite: () => void;
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
  browserRef: React.MutableRefObject<EmbeddedBrowserHandle | null>;
  history: HistoryEntry[];
  bookmarks: Bookmark[];
  navigate: (url: string) => void;
  goHome: () => void;
  addToHistory: (url: string, title: string) => void;
  toggleBookmark: (url: string, title: string) => void;
  isBookmarked: (url: string) => boolean;
  clearHistory: () => void;
  removeHistoryItem: (id: string) => void;
  removeBookmark: (id: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  findInPage: (term: string) => void;
  toggleDesktopSite: () => void;
}

const BrowserContext = createContext<BrowserContextType | null>(null);

const HISTORY_KEY = 'browser_history';
const BOOKMARKS_KEY = 'browser_bookmarks';

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState(HOME_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const browserRef = useRef<EmbeddedBrowserHandle | null>(null);

  useEffect(() => {
    Preferences.get({ key: HISTORY_KEY }).then(({ value }) => {
      if (value) setHistory(JSON.parse(value));
    });
    Preferences.get({ key: BOOKMARKS_KEY }).then(({ value }) => {
      if (value) setBookmarks(JSON.parse(value));
    });
  }, []);

  const navigate = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    setCurrentUrl(normalized);
    setCanGoBack(false);
    setCanGoForward(false);
  }, []);

  const goHome = useCallback(() => {
    setCurrentUrl(HOME_URL);
    setPageTitle('');
  }, []);

  const addToHistory = useCallback((url: string, title: string) => {
    if (!url || url === HOME_URL) return;
    setHistory((prev) => {
      const entry: HistoryEntry = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        url,
        title: title || getDisplayUrl(url),
        timestamp: Date.now(),
      };
      const filtered = prev.filter((h) => h.url !== url);
      const next = [entry, ...filtered].slice(0, 200);
      Preferences.set({ key: HISTORY_KEY, value: JSON.stringify(next) });
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
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            url,
            title: title || getDisplayUrl(url),
          },
          ...prev,
        ];
      }
      Preferences.set({ key: BOOKMARKS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (url: string) => bookmarks.some((b) => b.url === url),
    [bookmarks]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    Preferences.remove({ key: HISTORY_KEY });
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      Preferences.set({ key: HISTORY_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      Preferences.set({ key: BOOKMARKS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const goBack = useCallback(() => browserRef.current?.goBack(), []);
  const goForward = useCallback(() => browserRef.current?.goForward(), []);
  const reload = useCallback(() => browserRef.current?.reload(), []);
  const findInPage = useCallback((term: string) => browserRef.current?.findInPage(term), []);
  const toggleDesktopSite = useCallback(() => browserRef.current?.toggleDesktopSite(), []);

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
        goHome,
        addToHistory,
        toggleBookmark,
        isBookmarked,
        clearHistory,
        removeHistoryItem,
        removeBookmark,
        goBack,
        goForward,
        reload,
        findInPage,
        toggleDesktopSite,
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
