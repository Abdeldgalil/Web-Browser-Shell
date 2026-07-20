import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
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

function BrowserHost() {
  const colors = useColors();

  // Make the status bar transparent so our own background/photo extends
  // underneath it (edge-to-edge), instead of leaving a plain white strip.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
   StatusBar.setStyle({ style: Style.Light }).catch(() => {}); 
  }, []);

  const {
    currentUrl,
    activeTabId,
    pageTitle,
    navigate,
    setIsLoading,
    setCanGoBack,
    setCanGoForward,
    setPageTitle,
    addToHistory,
    browserRef,
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

  // Hide the native embedded webview (without closing it) whenever any of
  // our own HTML modals are open, since the native view always paints above
  // the Capacitor webview regardless of CSS z-index.
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

      if (!webviewIdRef.current) {
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
      } else {
        try {
          await (InAppBrowser as any).setUrl({ id: webviewIdRef.current, url: currentUrl });
        } catch {
          await InAppBrowser.close();
          const { id } = await InAppBrowser.openWebView({
            url: currentUrl,
            toolbarType: 'blank',
            width,
            height,
            x: 0,
            y: yPx,
          } as any);
          webviewIdRef.current = id ?? null;
        }
      }
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
      goBack: () => {
        if (!webviewIdRef.current) return;
        InAppBrowser.executeScript({ id: webviewIdRef.current, code: 'history.back();' } as any).catch(() => {});
      },
      goForward: () => {
        if (!webviewIdRef.current) return;
        InAppBrowser.executeScript({ id: webviewIdRef.current, code: 'history.forward();' } as any).catch(() => {});
      },
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
    setCanGoBack(true);
    setCanGoForward(true);
  }, [browserRef, setCanGoBack, setCanGoForward]);

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

  const handleTranslate = () => {
    if (isHome) return;
    navigate(`https://translate.google.com/translate?sl=auto&tl=ar&u=${encodeURIComponent(currentUrl)}`);
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
