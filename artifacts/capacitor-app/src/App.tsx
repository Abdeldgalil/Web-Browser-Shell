import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { InAppBrowser } from '@capgo/capacitor-inappbrowser';
import { useColors } from './hooks/useColors';
import { BrowserProvider, useBrowser, HOME_URL } from './context/BrowserContext';
import UrlBar, { URL_BAR_CONTENT_HEIGHT, URL_BAR_BOTTOM_PAD } from './components/UrlBar';
import Toolbar, { TOOLBAR_CONTENT_HEIGHT, TOOLBAR_TOP_PAD } from './components/Toolbar';
import BookmarksModal from './components/BookmarksModal';
import HistoryModal from './components/HistoryModal';
import HomePage from './components/HomePage';

function safeAreaTop(): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--safe-top');
  return parseInt(v || '0', 10) || 0;
}
function safeAreaBottom(): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom');
  return parseInt(v || '0', 10) || 0;
}

/**
 * Manages the embedded native WebView (via @capgo/capacitor-inappbrowser).
 * The plugin renders a real native WebView positioned/sized behind our
 * transparent HTML UI (toolbar + url bar), which is how content becomes
 * visible without hitting X-Frame-Options restrictions an <iframe> would.
 * When currentUrl is the app's own HOME_URL sentinel, no native webview is
 * opened at all — our own <HomePage/> renders instead.
 */
function BrowserHost() {
  const colors = useColors();
  const {
    currentUrl,
    setIsLoading,
    setCanGoBack,
    setCanGoForward,
    setPageTitle,
    addToHistory,
    browserRef,
  } = useBrowser();

  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const webviewIdRef = useRef<string | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const isHome = currentUrl === HOME_URL;

  const urlBarHeight = safeAreaTop() + URL_BAR_CONTENT_HEIGHT + URL_BAR_BOTTOM_PAD;
  const toolbarHeight = safeAreaBottom() + TOOLBAR_TOP_PAD + TOOLBAR_CONTENT_HEIGHT;

  // Open / reposition / close the embedded webview.
  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    async function openOrUpdate() {
      if (isHome) {
        // On the home page there's nothing to browse — close any open webview.
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

      if (!webviewIdRef.current) {
        const { id } = await InAppBrowser.openWebView({
          url: currentUrl,
          toolbarType: 'blank',
          toBack: true,
          transparentBackground: true,
          width,
          height,
          x: 0,
          y: urlBarHeight,
        } as any);
        if (cancelled) return;
        webviewIdRef.current = id ?? null;
      } else {
        try {
          await (InAppBrowser as any).setUrl({ id: webviewIdRef.current, url: currentUrl });
        } catch {
          // Fallback: some plugin versions don't expose setUrl — recreate the view.
          await InAppBrowser.close();
          const { id } = await InAppBrowser.openWebView({
            url: currentUrl,
            toolbarType: 'blank',
            toBack: true,
            transparentBackground: true,
            width,
            height,
            x: 0,
            y: urlBarHeight,
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
  }, [currentUrl, isNative, isHome]);

  // Keep the native webview's size/position in sync with the toolbar/url bar.
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

  // Wire the goBack/goForward/reload controls used by the Toolbar.
  useEffect(() => {
    browserRef.current = {
      goBack: () => {
        if (!webviewIdRef.current) return;
        InAppBrowser.executeScript({
          id: webviewIdRef.current,
          code: 'history.back();',
        } as any).catch(() => {});
      },
      goForward: () => {
        if (!webviewIdRef.current) return;
        InAppBrowser.executeScript({
          id: webviewIdRef.current,
          code: 'history.forward();',
        } as any).catch(() => {});
      },
      reload: () => {
        if (!webviewIdRef.current) return;
        InAppBrowser.executeScript({
          id: webviewIdRef.current,
          code: 'location.reload();',
        } as any).catch(() => {});
      },
    };
    // Back/forward availability isn't reported by this plugin's public API,
    // so both controls stay enabled and simply no-op at the ends of history.
    setCanGoBack(true);
    setCanGoForward(true);
  }, [browserRef, setCanGoBack, setCanGoForward]);

  // Listen for in-page navigation (link taps, redirects, form submits).
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

  return (
    <div className="app-root">
      <UrlBar />

      <div className="web-area" style={{ paddingTop: urlBarHeight, paddingBottom: toolbarHeight }}>
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

      <Toolbar onOpenBookmarks={() => setShowBookmarks(true)} onOpenHistory={() => setShowHistory(true)} />

      <BookmarksModal visible={showBookmarks} onClose={() => setShowBookmarks(false)} />
      <HistoryModal visible={showHistory} onClose={() => setShowHistory(false)} />
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
