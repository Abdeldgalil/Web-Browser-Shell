import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBrowser } from '@/context/BrowserContext';
import UrlBar, { URL_BAR_CONTENT_HEIGHT, URL_BAR_BOTTOM_PAD } from '@/components/UrlBar';
import Toolbar, { TOOLBAR_CONTENT_HEIGHT, TOOLBAR_TOP_PAD } from '@/components/Toolbar';
import BookmarksModal from '@/components/BookmarksModal';
import HistoryModal from '@/components/HistoryModal';

// Conditionally import WebView only on native
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

export default function BrowserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentUrl,
    setIsLoading,
    isLoading,
    setCanGoBack,
    setCanGoForward,
    addToHistory,
    setPageTitle,
    webViewRef,
  } = useBrowser();

  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const webTopPad = Platform.OS === 'web' ? 67 : 0;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;
  const urlBarHeight = insets.top + webTopPad + URL_BAR_CONTENT_HEIGHT + URL_BAR_BOTTOM_PAD;
  const toolbarHeight = insets.bottom + webBottomPad + TOOLBAR_CONTENT_HEIGHT + TOOLBAR_TOP_PAD;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <UrlBar />

      {/* WebView area */}
      <View style={[styles.webArea, { paddingTop: urlBarHeight, paddingBottom: toolbarHeight }]}>
        {Platform.OS === 'web' ? (
          <WebFallback currentUrl={currentUrl} colors={colors} />
        ) : (
          WebView && (
            <WebView
              ref={webViewRef}
              source={{ uri: currentUrl }}
              style={styles.webView}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onNavigationStateChange={(navState: any) => {
                setCanGoBack(navState.canGoBack ?? false);
                setCanGoForward(navState.canGoForward ?? false);
                if (navState.title) {
                  setPageTitle(navState.title);
                  addToHistory(navState.url, navState.title);
                }
              }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            />
          )
        )}
      </View>

      <Toolbar
        onOpenBookmarks={() => setShowBookmarks(true)}
        onOpenHistory={() => setShowHistory(true)}
      />

      <BookmarksModal visible={showBookmarks} onClose={() => setShowBookmarks(false)} />
      <HistoryModal visible={showHistory} onClose={() => setShowHistory(false)} />
    </View>
  );
}

function WebFallback({ currentUrl, colors }: { currentUrl: string; colors: any }) {
  return (
    <View style={[styles.webFallback, { backgroundColor: colors.background }]}>
      <View style={[styles.fallbackCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.fallbackIcon]}>🌐</Text>
        <Text style={[styles.fallbackTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          Open in Expo Go
        </Text>
        <Text style={[styles.fallbackBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Scan the QR code from the URL bar to browse on your device.
        </Text>
        <View style={[styles.urlPreview, { backgroundColor: colors.muted }]}>
          <Text style={[styles.urlPreviewText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
            {currentUrl}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webArea: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 340,
  },
  fallbackIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  fallbackTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  fallbackBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  urlPreview: {
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    width: '100%',
  },
  urlPreviewText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
