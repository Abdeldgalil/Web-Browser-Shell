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
import DownloadsModal from './components/DownloadsModal';
import AboutModal from './components/AboutModal';
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

const FORCE_DARK_APPLY_SCRIPT = `
(function() {
  if (document.getElementById('__force_dark_style')) return;
  var style = document.createElement('style');
  style.id = '__force_dark_style';
  style.textContent = 'html{filter:invert(1) hue-rotate(180deg) !important;background:#fff !important;}' +
    'img,picture,video,iframe,canvas,svg{filter:invert(1) hue-rotate(180deg) !important;}';
  document.documentElement.appendChild(style);
})();
`;

const FORCE_DARK_REMOVE_SCRIPT = `
(function() {
  var s = document.getElementById('__force_dark_style');
  if (s) s.remove();
})();
`;

const READER_MODE_SCRIPT = `
(function() {
  try {
    var selectors = ['article', '[role="main"]', 'main', '.post-content', '.article-content', '.entry-content', '#content'];
    var root = null;
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.innerText && el.innerText.length > 200) { root = el; break; }
    }
    if (!root) {
      var candidates = document.querySelectorAll('div, section');
      var best = null, bestLen = 0;
      candidates.forEach(function(el) {
        var text = el.innerText || '';
        if (text.length > bestLen && el.querySelectorAll('p').length > 2) {
          bestLen = text.length;
          best = el;
        }
      });
      root = best || document.body;
    }
    var title = document.title || '';
    var contentHtml = root.innerHTML;
    var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var bg = isDark ? '#1c1c1e' : '#fdfdfd';
    var fg = isDark ? '#f2f2f2' : '#1c1c1e';
    document.documentElement.innerHTML =
      '<head><meta name="viewport" content="width=device-width, initial-scale=1"><style>' +
      'html,body{margin:0;padding:0;background:' + bg + ';color:' + fg + ';font-family:Georgia,serif;line-height:1.7;}' +
      '.__reader-wrap{max-width:680px;margin:0 auto;padding:28px 20px 60px;}' +
      '.__reader-wrap h1{font-size:26px;line-height:1.3;margin-bottom:18px;}' +
      '.__reader-wrap img{max-width:100%;height:auto;border-radius:8px;}' +
      '.__reader-wrap p{font-size:18px;margin:0 0 18px;}' +
      '.__reader-wrap a{color:inherit;}' +
      '.__reader-wrap iframe,.__reader-wrap script,.__reader-wrap style,.__reader-wrap noscript{display:none !important;}' +
      '</style></head><body><div class="__reader-wrap"><h1>' + title.replace(/</g,'&lt;') + '</h1>' + contentHtml + '</div></body>';
  } catch (e) {}
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

const AD_BLOCK_DOMAINS = [
  'doubleclick\\.net',
  'googlesyndication\\.com',
  'googleadservices\\.com',
  'google-analytics\\.com',
  'googletagmanager\\.com',
  'adservice\\.google\\.',
  'amazon-adsystem\\.com',
  'taboola\\.com',
  'outbrain\\.com',
  'criteo\\.(com|net)',
  'scorecardresearch\\.com',
  'adnxs\\.com',
  'moatads\\.com',
  'pubmatic\\.com',
  'rubiconproject\\.com',
  'casalemedia\\.com',
  'openx\\.net',
  'media\\.net',
  'adsrvr\\.org',
  'quantserve\\.com',
];

const AD_BLOCK_RULES = AD_BLOCK_DOMAINS.map((d) => ({
  urlRegex: `^https?://([a-z0-9-]+\\.)*${d}.*`,
  action: 'cancel' as const,
}));

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
    isIncognito,
    adBlockEnabled,
    setAdBlockEnabled,
    forceDarkEnabled,
    setForceDarkEnabled,
    navigate,
    goHome,
    goBack,
    goForward,
    canGoBack,
    setIsLoading,
    setPageTitle,
    addToHistory,
    trackInPageUrl,
    recordDownloadCompleted,
    recordDownloadFailed,
    browserRef,
    closeTab,
  } = useBrowser();

  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [desktopMode, setDesktopMode] = useState(false);
  const webviewIdRef = useRef<string | null>(null);
  const liveUrlRef = useRef<string>(HOME_URL);
  const isIncognitoRef = useRef(false);
  const forceDarkEnabledRef = useRef(false);
  const opChainRef = useRef<Promise<void>>(Promise.resolve());
  const lastBackPressRef = useRef(0);
  const isNative = Capacitor.isNativePlatform();
  const isHome = currentUrl === HOME_URL;
  const anyModalOpen = showBookmarks || showHistory || showMore || showTabs || showDownloads || showAbout;

  useEffect(() => {
    isIncognitoRef.current = isIncognito;
  }, [isIncognito]);

  useEffect(() => {
    forceDarkEnabledRef.current = forceDarkEnabled;
  }, [forceDarkEnabled]);

  useEffect(() => {
    if (!isNative) return;
    const sub = CapacitorApp.addListener('backButton', () => {
      const now = Date.now();
      if (now - lastBackPressRef.current < 400) return;
      lastBackPressRef.current = now;

      if (anyModalOpen) {
        setShowBookmarks(false);
        setShowHistory(false);
        setShowMore(false);
        setShowTabs(false);
        setShowDownloads(false);
        setShowAbout(false);
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

  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    async function openOrUpdate() {
      if (cancelled) return;

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
        try {
          await (InAppBrowser as any).setUrl({ id: webviewIdRef.current, url: currentUrl });
          if (!cancelled) liveUrlRef.current = currentUrl;
          return;
        } catch {
          await InAppBrowser.close().catch(() => {});
          webviewIdRef.current = null;
        }
      }
      if (cancelled) return;

      const { id } = await InAppBrowser.openWebView({
        url: currentUrl,
        toolbarType: 'blank',
        persistWebViewData: true,
        width,
        height,
        x: 0,
        y: yPx,
        ...(adBlockEnabled ? { outboundProxyRules: AD_BLOCK_RULES } : {}),
      } as any);

      if (cancelled) {
        if (id) InAppBrowser.close().catch(() => {});
        return;
      }
      webviewIdRef.current = id ?? null;
      liveUrlRef.current = currentUrl;
    }

    opChainRef.current = opChainRef.current.then(openOrUpdate).catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl, isNative, isHome, activeTabId, adBlockEnabled]);

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
        liveUrlRef.current = url;
        trackInPageUrl(url);
        try {
          const result = await InAppBrowser.executeScript({
            id: webviewIdRef.current ?? undefined,
            code: 'document.title',
          } as any);
          const title = (result as any)?.result ?? '';
          setPageTitle(title);
          if (!isIncognitoRef.current) addToHistory(url, title);
        } catch {
          if (!isIncognitoRef.current) addToHistory(url, '');
        }
      }),
      InAppBrowser.addListener('browserPageLoaded', () => {
        setIsLoading(false);
        if (forceDarkEnabledRef.current && webviewIdRef.current) {
          InAppBrowser.executeScript({ id: webviewIdRef.current, code: FORCE_DARK_APPLY_SCRIPT } as any).catch(() => {});
        }
      }),
      InAppBrowser.addListener('pageLoadError', () => setIsLoading(false)),
      InAppBrowser.addListener('downloadCompleted', (event: any) => {
        recordDownloadCompleted(event);
      }),
      InAppBrowser.addListener('downloadFailed', (event: any) => {
        recordDownloadFailed(event);
      }),
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

  const handleToggleForceDark = () => {
    const next = !forceDarkEnabled;
    setForceDarkEnabled(next);
    if (webviewIdRef.current) {
      const code = next ? FORCE_DARK_APPLY_SCRIPT : FORCE_DARK_REMOVE_SCRIPT;
      InAppBrowser.executeScript({ id: webviewIdRef.current, code } as any).catch(() => {});
    }
  };

  const handleReaderMode = () => {
    if (isHome || !webviewIdRef.current) return;
    InAppBrowser.executeScript({ id: webviewIdRef.current, code: READER_MODE_SCRIPT } as any).catch(() => {});
  };

  const handleTranslate = () => {
    if (isHome) return;
    const liveUrl = liveUrlRef.current;

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
      <DownloadsModal visible={showDownloads} onClose={() => setShowDownloads(false)} />
      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
      <MoreMenu
        visible={showMore}
        onClose={() => setShowMore(false)}
        onShare={handleShare}
        onFindInPage={() => setShowFindBar(true)}
        onToggleDesktop={handleToggleDesktop}
        onTranslate={handleTranslate}
        onOpenBookmarks={() => setShowBookmarks(true)}
        onOpenHistory={() => setShowHistory(true)}
        onOpenDownloads={() => setShowDownloads(true)}
        onReaderMode={handleReaderMode}
        onOpenAbout={() => setShowAbout(true)}
        desktopMode={desktopMode}
        disabled={isHome}
        adBlockEnabled={adBlockEnabled}
        onToggleAdBlock={() => setAdBlockEnabled(!adBlockEnabled)}
        forceDarkEnabled={forceDarkEnabled}
        onToggleForceDark={handleToggleForceDark}
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
