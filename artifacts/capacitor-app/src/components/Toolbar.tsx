import React from 'react';
import { ChevronLeft, ChevronRight, RotateCw, X, Bookmark, Clock, Star } from 'lucide-react';
import { useColors, useColorScheme } from '../hooks/useColors';
import { useBrowser } from '../context/BrowserContext';

export const TOOLBAR_CONTENT_HEIGHT = 50;
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
        background: isDark ? 'rgba(28,28,30,0.72)' : 'rgba(248,248,250,0.72)',
        borderTopColor: colors.border,
        paddingTop: TOOLBAR_TOP_PAD,
      }}
    >
      <div className="toolbar-row" style={{ height: TOOLBAR_CONTENT_HEIGHT }}>
        <Btn onPress={goBack} disabled={!canGoBack} colors={colors} label="Back">
          <ChevronLeft size={24} strokeWidth={2.25} />
        </Btn>
        <Btn onPress={goForward} disabled={!canGoForward} colors={colors} label="Forward">
          <ChevronRight size={24} strokeWidth={2.25} />
        </Btn>
        <Btn onPress={reload} colors={colors} label="Reload">
          {isLoading ? <X size={20} strokeWidth={2.25} /> : <RotateCw size={19} strokeWidth={2.25} />}
        </Btn>
        <Btn onPress={() => toggleBookmark(currentUrl, pageTitle)} active={bookmarked} colors={colors} label="Bookmark">
          <Bookmark size={20} strokeWidth={2.25} fill={bookmarked ? 'currentColor' : 'none'} />
        </Btn>
        <Btn onPress={onOpenHistory} colors={colors} label="History">
          <Clock size={20} strokeWidth={2.25} />
        </Btn>
        <Btn onPress={onOpenBookmarks} colors={colors} label="Bookmarks">
          <Star size={20} strokeWidth={2.25} />
        </Btn>
      </div>
    </div>
  );
}

function Btn({
  children,
  onPress,
  disabled,
  active,
  colors,
  label,
}: {
  children: React.ReactNode;
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
        color: disabled ? colors.mutedForeground : active ? colors.primary : colors.foreground,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  );
}
