import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { InAppBrowser } from '@capgo/capacitor-inappbrowser';
import { X } from 'lucide-react';
import { useColors } from './hooks/useColors';
import { BrowserProvider, useBrowser, HOME_URL } from './context/BrowserContext';
import UrlBar, { URL_BAR_CONTENT_HEIGHT, URL_BAR_BOTTOM_PAD } from './components/UrlBar';
import Toolbar, { TOOLBAR_CONTENT_HEIGHT, TOOLBAR_TOP_PAD } from './components/Toolbar';
import BookmarksModal from './components/BookmarksModal';
import HistoryModal from './components/HistoryModal';
import MoreMenu from './components/MoreMenu';
import TabSwitcher from './components/TabSwitcher';
import HomePage from './components/HomePage';

function safeAreaTop(): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--safe-top');
  return parseInt(v || '0', 10) || 0;
}
function safeAreaBottom(): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom');
  return parseInt(v || '0', 10) || 0;
}

const DESKTOP_VIEWPORT_SCRIPT = `
(function() {
  var m = document.querySelector('meta[name="viewport"]');
  if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
  m.setAttribute('content', 'width=1280');
})();
`;

function isTranslatedUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.translate.goog');
  } catch {
    return false;
  }
}

function buildTranslateUrl(original: string): string {
  const u = new URL(original);
  const host = u.hostname.replace(/\./g, '-') + '.translate.goog';
  const path = u.pathname + u.search;
  const sep = path.includes('?') ? '&' : '?';
  return `https://${host}${path}${sep}_x_tr_sl=auto&_x_tr_tl=ar&_x_tr_hl=en&_x_tr_pto=wapp`;
}

function unwrapTranslatedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('.translate.goog')) return null;
    const originalHost = u.hostname.slice(0, -'.translate.goog'.length).replace(/-/g, '.');
    const params = new URLSearchParams(u.search);
    ['_x_tr_sl', '_x_tr_tl', '_x_tr_hl', '_x_tr_pto'].forEach((k) => params.delete(k));
    const qs = params.toString();
    return `https://${originalHost}${u.pathname}${qs ? '?' + qs : ''}`;
  } catch {
    return null;
  }
}

function BrowserHost() {
  const colors = useColors();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  }, []);

  const {
    currentUrl,
    activeTabId,
    tabs,
    pageTitle,
    navigate,
    goHome,
    goBack,
    goForward,
    canGoBack,
    setIsLoading,
    setPageTitle,
    addToHistory,
    browserRef,
    closeTab,
  } = useBrowser();

  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [desktopMode, setDesktopMode] = useState(false);
  const webviewIdRef = useRef<string | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const isHome = currentUrl === HOME_URL;
  const anyModalOpen = showBookmarks || showHistory || showMore || showTabs;

  useEffect(() => {
    if (!isNative) return;
    const sub = CapacitorApp.addListener('backButton', () => {
      if (anyModalOpen) {
        setShowBookmarks(false);
        setShowHistory(false);
        setShowMore(false);
        setShowTabs(false);
        return;
      }
      if (showFindBar) {
        setShowFindBar(false);
        return;
      }
      if (canGoBack) {
        goBack();
      } else if (!isHome) {
        goHome();
      } else if (tabs.length > 1) {
        closeTab(activeTabId);
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      sub.then((h) => h.remove());
    };
  }, [isNative, anyModalOpen, showFindBar, canGoBack, goBack, isHome, goHome, tabs.length, activeTabId, closeTab]);

  useEffect(() => {
    if (!isNative || !webviewIdRef.current) return;
    if (anyModalOpen) {
      (InAppBrowser as any).hide({ id: webviewIdRef.current }).catch(() => {});
    } else {
      (InAppBrowser as any).show({ id: webviewIdRef.current }).catch(() => {});
    }
  }, [anyModalOpen, isNative]);

  const urlBarHeight = safeAreaTop() + URL_BAR_CONTENT_HEIGHT + URL_BAR_BOTTOM_PAD;
  const toolbarHeight = safeAreaBottom() + TOOLBAR_TOP_PAD + TOOLBAR_CONTENT_HEIGHT;
  const topPad = isHome ? safeAreaTop() : urlBarHeight;

  // Open / reposition / close the embedded webview. Re-runs on tab switch too.
  // Always fully closes and reopens on every navigation (including back/
  // forward) instead of using setUrl — setUrl proved unreliable, sometimes
  // silently ignoring a navigation while the previous page was still
  // loading, which is why back required two presses.
  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    async function openOrUpdate() {
      if (isHome) {
        if (webviewIdRef.current) {
          await InAppBrowser.close().catch(() => {});
          webviewIdRef.current = null;
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const width = window.innerWidth;
      const height = window.innerHeight - urlBarHeight - toolbarHeight;
      const yPx = urlBarHeight;

      if (webviewIdRef.current) {
        await InAppBrowser.close().catch(() => {});
        webviewIdRef.current = null;
      }
      if (cancelled) return;

      const { id } = await InAppBrowser.openWebView({
        url: currentUrl,
        toolbarType: 'blank',
        width,
        height,
        x: 0,
        y: yPx,
      } as any);
      if (cancelled) return;
      webviewIdRef.current = id ?? null;
    }

    openOrUpdate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl, isNative, isHome, activeTabId]);

  useEffect(() => {
    if (!isNative || isHome) return;
    const resize = () => {
      if (!webviewIdRef.current) return;
      InAppBrowser.updateDimensions({
        id: webviewIdRef.current,
        width: window.innerWidth,
        height: window.innerHeight - urlBarHeight - toolbarHeight,
        x: 0,
        y: urlBarHeight,
      } as any).catch(() => {});
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isNative, isHome, urlBarHeight, toolbarHeight]);

  useEffect(() => {
    browserRef.current = {
      reload: () => {
        if (!webviewIdRef.current) return;
        InAppBrowser.executeScript({ id: webviewIdRef.current, code: 'location.reload();' } as any).catch(() => {});
      },
      findInPage: (term: string) => {
        if (!webviewIdRef.current || !term) return;
        const code = `try { window.find(${JSON.stringify(term)}, false, false, true); } catch (e) {}`;
        InAppBrowser.executeScript({ id: webviewIdRef.current, code } as any).catch(() => {});
      },
      toggleDesktopSite: () => {
        if (!webviewIdRef.current) return;
        InAppBrowser.executeScript({ id: webviewIdRef.current, code: DESKTOP_VIEWPORT_SCRIPT } as any).catch(() => {});
      },
    };
  }, [browserRef]);

  useEffect(() => {
    if (!isNative) return;
    const subs = [
      InAppBrowser.addListener('urlChangeEvent', async (event: any) => {
        const url = event?.url;
        if (!url) return;
        try {
          const result = await InAppBrowser.executeScript({
            id: webviewIdRef.current ?? undefined,
            code: 'document.title',
          } as any);
          const title = (result as any)?.result ?? '';
          setPageTitle(title);
          addToHistory(url, title);
        } catch {
          addToHistory(url, '');
        }
      }),
      InAppBrowser.addListener('browserPageLoaded', () => setIsLoading(false)),
      InAppBrowser.addListener('pageLoadError', () => setIsLoading(false)),
    ];
    return () => {
      subs.forEach((p) => p.then((h) => h.remove()));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  const handleShare = async () => {
    try {
      await Share.share({ title: pageTitle || undefined, url: currentUrl });
    } catch {
      // user cancelled or share unavailable
    }
  };

  const handleToggleDesktop = () => {
    setDesktopMode((v) => !v);
    browserRef.current?.toggleDesktopSite();
  };

  // Reads the live URL straight from the webview (not our possibly-stale
  // React state). Uses the *.translate.goog scheme (full real pages, not an
  // iframe), so location.href updates correctly as you browse inside the
  // translated site — toggling translate again re-translates the actual
  // sub-page you're on, or unwraps back to the original if already
  // translated.
  const handleTranslate = async () => {
    if (isHome || !webviewIdRef.current) return;
    let liveUrl = currentUrl;
    try {
      const result = await InAppBrowser.executeScript({
        id: webviewIdRef.current,
        code: 'location.href',
      } as any);
      if ((result as any)?.result) liveUrl = (result as any).result;
    } catch {
      // fall back to the last known currentUrl
    }

    if (isTranslatedUrl(liveUrl)) {
      const original = unwrapTranslatedUrl(liveUrl);
      if (original) navigate(original);
      return;
    }

    navigate(buildTranslateUrl(liveUrl));
  };

  const submitFind = (e: React.FormEvent) => {
    e.preventDefault();
    browserRef.current?.findInPage(findTerm);
  };

  return (
    <div className="app-root">
      {!isHome && <UrlBar />}

      {showFindBar && !isHome && (
        <div className="findbar" style={{ top: urlBarHeight, background: colors.card, borderColor: colors.border }}>
          <form onSubmit={submitFind} className="findbar-form">
            <input
              className="findbar-input"
              style={{ color: colors.foreground }}
              autoFocus
              value={findTerm}
              onChange={(e) => setFindTerm(e.target.value)}
              placeholder="Find in page"
            />
          </form>
          <button
            className="findbar-close"
            onClick={() => {
              setShowFindBar(false);
              setFindTerm('');
            }}
          >
            <X size={18} strokeWidth={2.25} color={colors.mutedForeground} />
          </button>
        </div>
      )}

      <div className="web-area" style={{ paddingTop: topPad, paddingBottom: toolbarHeight }}>
        {isHome ? (
          <HomePage />
        ) : (
          !isNative && (
            <div className="dev-fallback" style={{ background: colors.card, borderColor: colors.border }}>
              <div className="dev-fallback-icon">🌐</div>
              <div className="dev-fallback-title" style={{ color: colors.foreground }}>
                Run inside the Android app to browse
              </div>
              <div className="dev-fallback-body" style={{ color: colors.mutedForeground }}>
                The embedded page renders through a native WebView (via
                @capgo/capacitor-inappbrowser), which isn't available in this
                browser preview. Build and run on a device/emulator to see{' '}
                {currentUrl}.
              </div>
            </div>
          )
        )}
      </div>

      <Toolbar onOpenTabs={() => setShowTabs(true)} onOpenMore={() => setShowMore(true)} />

      <BookmarksModal visible={showBookmarks} onClose={() => setShowBookmarks(false)} />
      <HistoryModal visible={showHistory} onClose={() => setShowHistory(false)} />
      <TabSwitcher visible={showTabs} onClose={() => setShowTabs(false)} />
      <MoreMenu
        visible={showMore}
        onClose={() => setShowMore(false)}
        onShare={handleShare}
        onFindInPage={() => setShowFindBar(true)}
        onToggleDesktop={handleToggleDesktop}
        onTranslate={handleTranslate}
        onOpenBookmarks={() => setShowBookmarks(true)}
        onOpenHistory={() => setShowHistory(true)}
        desktopMode={desktopMode}
        disabled={isHome}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserProvider>
      <BrowserHost />
    </BrowserProvider>
  );
}
