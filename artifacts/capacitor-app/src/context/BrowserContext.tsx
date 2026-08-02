import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileTransfer } from '@capacitor/file-transfer';

export const HOME_URL = 'app://home';

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return HOME_URL;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/;
  if (domainPattern.test(trimmed) && !trimmed.includes(' ')) return `https://${trimmed}`;
  return `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`;
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
  incognito: boolean;
}

export interface ClosedTabInfo {
  id: string;
  url: string;
  title: string;
  closedAt: number;
}

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: 'queued' | 'downloading' | 'done' | 'error';
  progress: number;
  path: string;
  timestamp: number;
}

export interface Shortcut {
  id: string;
  name: string;
  url: string;
  iconKey: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'yt', name: 'YouTube', url: 'https://www.youtube.com', iconKey: 'youtube' },
  { id: 'fb', name: 'Facebook', url: 'https://www.facebook.com', iconKey: 'facebook' },
  { id: 'tw', name: 'Twitter / X', url: 'https://www.x.com', iconKey: 'twitter' },
  { id: 'ig', name: 'Instagram', url: 'https://www.instagram.com', iconKey: 'instagram' },
  { id: 'wiki', name: 'Wikipedia', url: 'https://www.wikipedia.org', iconKey: 'wikipedia' },
  { id: 'amz', name: 'Amazon', url: 'https://www.amazon.com', iconKey: 'amazon' },
];

export interface EmbeddedBrowserHandle {
  reload: () => void;
  findInPage: (term: string) => void;
  toggleDesktopSite: () => void;
}

function makeId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 7);
}

function makeTab(url: string = HOME_URL, incognito: boolean = false): Tab {
  return { id: makeId(), url, title: '', stack: [url], index: 0, incognito };
}

interface BrowserContextType {
  tabs: Tab[];
  activeTabId: string;
  currentUrl: string;
  pageTitle: string;
  setPageTitle: (t: string) => void;
  isIncognito: boolean;
  adBlockEnabled: boolean;
  setAdBlockEnabled: (v: boolean) => void;
  forceDarkEnabled: boolean;
  setForceDarkEnabled: (v: boolean) => void;
  shortcuts: Shortcut[];
  addShortcut: (name: string, url: string) => void;
  removeShortcut: (id: string) => void;
  moveShortcut: (id: string, direction: -1 | 1) => void;
  recentlyClosed: ClosedTabInfo[];
  reopenClosedTab: (id: string) => void;
  clearRecentlyClosed: () => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  browserRef: React.MutableRefObject<EmbeddedBrowserHandle | null>;
  history: HistoryEntry[];
  bookmarks: Bookmark[];
  downloads: DownloadItem[];
  startDownload: (url: string, filenameHint?: string) => void;
  removeDownload: (id: string) => void;
  recordDownloadCompleted: (event: { fileName?: string; path?: string; localUrl?: string }) => void;
  recordDownloadFailed: (event: { fileName?: string }) => void;
  navigate: (url: string) => void;
  goHome: () => void;
  newTab: (url?: string, incognito?: boolean) => void;
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
  trackInPageUrl: (url: string) => void;
}

const BrowserContext = createContext<BrowserContextType | null>(null);

const HISTORY_KEY = 'browser_history';
const BOOKMARKS_KEY = 'browser_bookmarks';
const DOWNLOADS_KEY = 'browser_downloads';
const AD_BLOCK_KEY = 'ad_block_enabled';
const FORCE_DARK_KEY = 'force_dark_enabled';
const SHORTCUTS_KEY = 'custom_shortcuts';
const SESSION_KEY = 'browser_session_v1';
const CLOSED_TABS_KEY = 'recently_closed_tabs';
const MAX_CLOSED_TABS = 10;

interface PersistedSessionTab {
  url: string;
  title: string;
}

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>(() => [makeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [adBlockEnabled, setAdBlockEnabledState] = useState(false);
  const [forceDarkEnabled, setForceDarkEnabledState] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [recentlyClosed, setRecentlyClosed] = useState<ClosedTabInfo[]>([]);
  const browserRef = useRef<EmbeddedBrowserHandle | null>(null);
  const downloadBusyRef = useRef(false);
  const sessionHydratedRef = useRef(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const currentUrl = activeTab?.url ?? HOME_URL;
  const pageTitle = activeTab?.title ?? '';
  const isIncognito = activeTab?.incognito ?? false;
  const canGoBack = (activeTab?.index ?? 0) > 0;
  const canGoForward = (activeTab?.index ?? 0) < (activeTab?.stack.length ?? 1) - 1;

  useEffect(() => {
    Preferences.get({ key: HISTORY_KEY }).then(({ value }) => {
      if (value) setHistory(JSON.parse(value));
    });
    Preferences.get({ key: BOOKMARKS_KEY }).then(({ value }) => {
      if (value) setBookmarks(JSON.parse(value));
    });
    Preferences.get({ key: DOWNLOADS_KEY }).then(({ value }) => {
      if (!value) return;
      const loaded: DownloadItem[] = JSON.parse(value);
      const fixed = loaded.map((d) =>
        d.status === 'downloading' || d.status === 'queued' ? { ...d, status: 'error' as const } : d
      );
      setDownloads(fixed);
    });
    Preferences.get({ key: AD_BLOCK_KEY }).then(({ value }) => {
      if (value !== null) setAdBlockEnabledState(value === 'true');
    });
    Preferences.get({ key: FORCE_DARK_KEY }).then(({ value }) => {
      if (value !== null) setForceDarkEnabledState(value === 'true');
    });
    Preferences.get({ key: SHORTCUTS_KEY }).then(({ value }) => {
      if (value) setShortcuts(JSON.parse(value));
    });
    Preferences.get({ key: CLOSED_TABS_KEY }).then(({ value }) => {
      if (value) setRecentlyClosed(JSON.parse(value));
    });
    // Session restore: bring back the tabs open last time (private tabs are
    // never persisted). Each restored tab starts a fresh navigation stack —
    // only the current URL/title are remembered, not full back/forward
    // history per tab.
    Preferences.get({ key: SESSION_KEY }).then(({ value }) => {
      sessionHydratedRef.current = true;
      if (!value) return;
      try {
        const saved: PersistedSessionTab[] = JSON.parse(value);
        if (!Array.isArray(saved) || saved.length === 0) return;
        const restored = saved.map((s) => {
          const t = makeTab(s.url, false);
          t.title = s.title || '';
          return t;
        });
        setTabs(restored);
        setActiveTabId(restored[0].id);
      } catch {
        // ignore corrupt session data
      }
    });
  }, []);

  // Persist the session (non-incognito tabs only) whenever it changes, but
  // only after the initial restore attempt above has completed — otherwise
  // we'd overwrite the saved session with the default blank tab first.
  useEffect(() => {
    if (!sessionHydratedRef.current) return;
    const persistable: PersistedSessionTab[] = tabs
      .filter((t) => !t.incognito)
      .map((t) => ({ url: t.url, title: t.title }));
    Preferences.set({ key: SESSION_KEY, value: JSON.stringify(persistable) });
  }, [tabs]);

  const setAdBlockEnabled = useCallback((v: boolean) => {
    setAdBlockEnabledState(v);
    Preferences.set({ key: AD_BLOCK_KEY, value: String(v) });
  }, []);

  const setForceDarkEnabled = useCallback((v: boolean) => {
    setForceDarkEnabledState(v);
    Preferences.set({ key: FORCE_DARK_KEY, value: String(v) });
  }, []);

  const addShortcut = useCallback((name: string, url: string) => {
    setShortcuts((prev) => {
      const next = [
        ...prev,
        { id: makeId(), name: name.trim() || getDisplayUrl(normalizeUrl(url)), url: normalizeUrl(url), iconKey: 'generic' },
      ];
      Preferences.set({ key: SHORTCUTS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const removeShortcut = useCallback((id: string) => {
    setShortcuts((prev) => {
      const next = prev.filter((s) => s.id !== id);
      Preferences.set({ key: SHORTCUTS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const moveShortcut = useCallback((id: string, direction: -1 | 1) => {
    setShortcuts((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const targetIdx = idx + direction;
      if (idx === -1 || targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      Preferences.set({ key: SHORTCUTS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const updateActiveTab = useCallback(
    (patch: Partial<Tab>) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...patch } : t)));
    },
    [activeTabId]
  );

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

  const trackInPageUrl = useCallback(
    (url: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          if (t.stack[t.index] === url) return t;
          const truncated = t.stack.slice(0, t.index + 1);
          const nextStack = [...truncated, url];
          return { ...t, stack: nextStack, index: nextStack.length - 1 };
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

  const newTab = useCallback((url: string = HOME_URL, incognito: boolean = false) => {
    const tab = makeTab(url, incognito);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const closing = prev.find((t) => t.id === id);
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return prev;

        // Remember it for "Recently closed" — private tabs are excluded,
        // and the app's own home page isn't worth remembering.
        if (closing && !closing.incognito && closing.url !== HOME_URL) {
          setRecentlyClosed((prevClosed) => {
            const entry: ClosedTabInfo = {
              id: makeId(),
              url: closing.url,
              title: closing.title || getDisplayUrl(closing.url),
              closedAt: Date.now(),
            };
            const next = [entry, ...prevClosed].slice(0, MAX_CLOSED_TABS);
            Preferences.set({ key: CLOSED_TABS_KEY, value: JSON.stringify(next) });
            return next;
          });
        }

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

  const reopenClosedTab = useCallback(
    (id: string) => {
      setRecentlyClosed((prev) => {
        const entry = prev.find((c) => c.id === id);
        if (entry) {
          const tab = makeTab(entry.url, false);
          tab.title = entry.title;
          setTabs((prevTabs) => [...prevTabs, tab]);
          setActiveTabId(tab.id);
        }
        const next = prev.filter((c) => c.id !== id);
        Preferences.set({ key: CLOSED_TABS_KEY, value: JSON.stringify(next) });
        return next;
      });
    },
    []
  );

  const clearRecentlyClosed = useCallback(() => {
    setRecentlyClosed([]);
    Preferences.remove({ key: CLOSED_TABS_KEY });
  }, []);

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

  const recordDownloadCompleted = useCallback((event: { fileName?: string; path?: string; localUrl?: string }) => {
    setDownloads((prev) => {
      const entry: DownloadItem = {
        id: makeId(),
        url: '',
        filename: event.fileName || 'download',
        status: 'done',
        progress: 100,
        path: event.localUrl || event.path || '',
        timestamp: Date.now(),
      };
      const next = [entry, ...prev];
      Preferences.set({ key: DOWNLOADS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const recordDownloadFailed = useCallback((event: { fileName?: string }) => {
    setDownloads((prev) => {
      const entry: DownloadItem = {
        id: makeId(),
        url: '',
        filename: event.fileName || 'download',
        status: 'error',
        progress: 0,
        path: '',
        timestamp: Date.now(),
      };
      const next = [entry, ...prev];
      Preferences.set({ key: DOWNLOADS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const startDownload = useCallback((url: string, filenameHint?: string) => {
    let filename = filenameHint || '';
    if (!filename) {
      try {
        const u = new URL(url);
        const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
        filename = last || `download-${Date.now()}`;
      } catch {
        filename = `download-${Date.now()}`;
      }
    }
    const entry: DownloadItem = {
      id: makeId(),
      url,
      filename,
      status: 'queued',
      progress: 0,
      path: '',
      timestamp: Date.now(),
    };
    setDownloads((prev) => {
      const next = [entry, ...prev];
      Preferences.set({ key: DOWNLOADS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  const removeDownload = useCallback((id: string) => {
    setDownloads((prev) => {
      const entry = prev.find((d) => d.id === id);
      if (entry?.path) {
        Filesystem.deleteFile({ path: entry.path }).catch(() => {});
      }
      const next = prev.filter((d) => d.id !== id);
      Preferences.set({ key: DOWNLOADS_KEY, value: JSON.stringify(next) });
      return next;
    });
  }, []);

  useEffect(() => {
    if (downloadBusyRef.current) return;
    const next = downloads.find((d) => d.status === 'queued');
    if (!next) return;
    downloadBusyRef.current = true;

    let progressHandle: { remove: () => void } | null = null;

    (async () => {
      setDownloads((prev) => {
        const upd = prev.map((d) => (d.id === next.id ? { ...d, status: 'downloading' as const } : d));
        Preferences.set({ key: DOWNLOADS_KEY, value: JSON.stringify(upd) });
        return upd;
      });

      try {
        const fileInfo = await Filesystem.getUri({ directory: Directory.Documents, path: next.filename });
        progressHandle = await FileTransfer.addListener('progress', (p: any) => {
          const pct = p?.contentLength > 0 ? Math.round((p.bytes / p.contentLength) * 100) : -1;
          setDownloads((prev) => prev.map((d) => (d.id === next.id ? { ...d, progress: pct } : d)));
        });

        await FileTransfer.downloadFile({ url: next.url, path: fileInfo.uri, progress: true } as any);

        setDownloads((prev) => {
          const upd = prev.map((d) =>
            d.id === next.id ? { ...d, status: 'done' as const, progress: 100, path: fileInfo.uri } : d
          );
          Preferences.set({ key: DOWNLOADS_KEY, value: JSON.stringify(upd) });
          return upd;
        });
      } catch {
        setDownloads((prev) => {
          const upd = prev.map((d) => (d.id === next.id ? { ...d, status: 'error' as const } : d));
          Preferences.set({ key: DOWNLOADS_KEY, value: JSON.stringify(upd) });
          return upd;
        });
      } finally {
        progressHandle?.remove();
        downloadBusyRef.current = false;
      }
    })();
  }, [downloads]);

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
        isIncognito,
        adBlockEnabled,
        setAdBlockEnabled,
        forceDarkEnabled,
        setForceDarkEnabled,
        shortcuts,
        addShortcut,
        removeShortcut,
        moveShortcut,
        recentlyClosed,
        reopenClosedTab,
        clearRecentlyClosed,
        isLoading,
        setIsLoading,
        canGoBack,
        canGoForward,
        browserRef,
        history,
        bookmarks,
        downloads,
        startDownload,
        removeDownload,
        recordDownloadCompleted,
        recordDownloadFailed,
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
        trackInPageUrl,
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
