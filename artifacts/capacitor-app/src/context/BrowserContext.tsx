import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Preferences } from '@capacitor/preferences';

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

export interface Tab {
  id: string;
  url: string;
  title: string;
  stack: string[];
  index: number;
}

// Populated by the embedded-browser controller in App.tsx once the native
// InAppBrowser WebView is opened.
export interface EmbeddedBrowserHandle {
  reload: () => void;
  findInPage: (term: string) => void;
  toggleDesktopSite: () => void;
}

function makeId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 7);
}

function makeTab(url: string = HOME_URL): Tab {
  return { id: makeId(), url, title: '', stack: [url], index: 0 };
}

interface BrowserContextType {
  tabs: Tab[];
  activeTabId: string;
  currentUrl: string;
  pageTitle: string;
  setPageTitle: (t: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  browserRef: React.MutableRefObject<EmbeddedBrowserHandle | null>;
  history: HistoryEntry[];
  bookmarks: Bookmark[];
  navigate: (url: string) => void;
  goHome: () => void;
  newTab: (url?: string) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
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
  const [tabs, setTabs] = useState<Tab[]>(() => [makeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const browserRef = useRef<EmbeddedBrowserHandle | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const currentUrl = activeTab?.url ?? HOME_URL;
  const pageTitle = activeTab?.title ?? '';
  const canGoBack = (activeTab?.index ?? 0) > 0;
  const canGoForward = (activeTab?.index ?? 0) < (activeTab?.stack.length ?? 1) - 1;

  useEffect(() => {
    Preferences.get({ key: HISTORY_KEY }).then(({ value }) => {
      if (value) setHistory(JSON.parse(value));
    });
    Preferences.get({ key: BOOKMARKS_KEY }).then(({ value }) => {
      if (value) setBookmarks(JSON.parse(value));
    });
  }, []);

  const updateActiveTab = useCallback(
    (patch: Partial<Tab>) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...patch } : t)));
    },
    [activeTabId]
  );

  // Pushes a new URL onto this tab's own back/forward stack (truncating any
  // forward entries), rather than relying on the embedded native WebView's
  // history — which doesn't reliably track our own setUrl-based navigation.
  const navigate = useCallback(
    (url: string) => {
      const normalized = normalizeUrl(url);
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          const truncated = t.stack.slice(0, t.index + 1);
          const nextStack = [...truncated, normalized];
          return {
            ...t,
            url: normalized,
            title: normalized === HOME_URL ? '' : t.title,
            stack: nextStack,
            index: nextStack.length - 1,
          };
        })
      );
    },
    [activeTabId]
  );

  const goHome = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;
        const truncated = t.stack.slice(0, t.index + 1);
        const nextStack = [...truncated, HOME_URL];
        return {
          ...t,
          url: HOME_URL,
          title: '',
          stack: nextStack,
          index: nextStack.length - 1,
        };
      })
    );
  }, [activeTabId]);

  const goBack = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId || t.index <= 0) return t;
        const newIndex = t.index - 1;
        return { ...t, index: newIndex, url: t.stack[newIndex] };
      })
    );
  }, [activeTabId]);

  const goForward = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId || t.index >= t.stack.length - 1) return t;
        const newIndex = t.index + 1;
        return { ...t, index: newIndex, url: t.stack[newIndex] };
      })
    );
  }, [activeTabId]);

  const setPageTitle = useCallback(
    (t: string) => {
      updateActiveTab({ title: t });
    },
    [updateActiveTab]
  );

  const newTab = useCallback((url: string = HOME_URL) => {
    const tab = makeTab(url);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return prev;
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) {
          const fresh = makeTab();
          setActiveTabId(fresh.id);
          return [fresh];
        }
        if (id === activeTabId) {
          const newActive = next[Math.max(0, idx - 1)];
          setActiveTabId(newActive.id);
        }
        return next;
      });
    },
    [activeTabId]
  );

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const addToHistory = useCallback((url: string, title: string) => {
    if (!url || url === HOME_URL) return;
    setHistory((prev) => {
      const entry: HistoryEntry = {
        id: makeId(),
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
        next = [{ id: makeId(), url, title: title || getDisplayUrl(url) }, ...prev];
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

  const reload = useCallback(() => browserRef.current?.reload(), []);
  const findInPage = useCallback((term: string) => browserRef.current?.findInPage(term), []);
  const toggleDesktopSite = useCallback(() => browserRef.current?.toggleDesktopSite(), []);

  return (
    <BrowserContext.Provider
      value={{
        tabs,
        activeTabId,
        currentUrl,
        pageTitle,
        setPageTitle,
        isLoading,
        setIsLoading,
        canGoBack,
        canGoForward,
        browserRef,
        history,
        bookmarks,
        navigate,
        goHome,
        newTab,
        closeTab,
        switchTab,
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
