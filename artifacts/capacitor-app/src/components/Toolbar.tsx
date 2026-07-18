import React from 'react';
import { useColors, useColorScheme } from '../hooks/useColors';
import { useBrowser } from '../context/BrowserContext';

export const TOOLBAR_CONTENT_HEIGHT = 44;
export const TOOLBAR_TOP_PAD = 8;

interface Props {
  onOpenBookmarks: () => void;
  onOpenHistory: () => void;
}

export default function Toolbar({ onOpenBookmarks, onOpenHistory }: Props) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const {
    canGoBack,
    canGoForward,
    isLoading,
    goBack,
    goForward,
    reload,
    currentUrl,
    pageTitle,
    toggleBookmark,
    isBookmarked,
  } = useBrowser();

  const bookmarked = isBookmarked(currentUrl);

  return (
    <div
      className="toolbar"
      style={{
        background: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(242,242,247,0.85)',
        borderTopColor: colors.border,
        paddingTop: TOOLBAR_TOP_PAD,
      }}
    >
      <div className="toolbar-row" style={{ height: TOOLBAR_CONTENT_HEIGHT }}>
        <Btn icon="◀" onPress={goBack} disabled={!canGoBack} colors={colors} label="Back" />
        <Btn icon="▶" onPress={goForward} disabled={!canGoForward} colors={colors} label="Forward" />
        <Btn icon={isLoading ? '✕' : '⟳'} onPress={reload} colors={colors} label="Reload" />
        <Btn
          icon="🔖"
          onPress={() => toggleBookmark(currentUrl, pageTitle)}
          active={bookmarked}
          colors={colors}
          label="Bookmark"
        />
        <Btn icon="🕘" onPress={onOpenHistory} colors={colors} label="History" />
        <Btn icon="⭐" onPress={onOpenBookmarks} colors={colors} label="Bookmarks" />
      </div>
    </div>
  );
}

function Btn({
  icon,
  onPress,
  disabled,
  active,
  colors,
  label,
}: {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  colors: any;
  label: string;
}) {
  return (
    <button
      className="toolbar-btn"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      style={{
        color: disabled ? colors.border : active ? colors.primary : colors.foreground,
      }}
    >
      {icon}
    </button>
  );
}
