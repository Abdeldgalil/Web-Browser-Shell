import React from 'react';
import { ChevronLeft, ChevronRight, RotateCw, X, Home, MoreVertical } from 'lucide-react';
import { useColors, useColorScheme } from '../hooks/useColors';
import { useBrowser, HOME_URL } from '../context/BrowserContext';

export const TOOLBAR_CONTENT_HEIGHT = 50;
export const TOOLBAR_TOP_PAD = 8;

interface Props {
  onOpenTabs: () => void;
  onOpenMore: () => void;
}

export default function Toolbar({ onOpenTabs, onOpenMore }: Props) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const { canGoBack, canGoForward, isLoading, goBack, goForward, reload, goHome, currentUrl, tabs } =
    useBrowser();

  const isHome = currentUrl === HOME_URL;

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
          <ChevronLeft size={22} strokeWidth={2.25} />
        </Btn>
        <Btn onPress={goForward} disabled={!canGoForward} colors={colors} label="Forward">
          <ChevronRight size={22} strokeWidth={2.25} />
        </Btn>
        <Btn onPress={goHome} active={isHome} colors={colors} label="Home">
          <Home size={19} strokeWidth={2.25} />
        </Btn>
        <Btn onPress={reload} disabled={isHome} colors={colors} label="Reload">
          {isLoading ? <X size={18} strokeWidth={2.25} /> : <RotateCw size={17} strokeWidth={2.25} />}
        </Btn>
        <Btn onPress={onOpenTabs} colors={colors} label="Tabs">
          <span className="toolbar-tabs-icon">{tabs.length}</span>
        </Btn>
        <Btn onPress={onOpenMore} colors={colors} label="More">
          <MoreVertical size={20} strokeWidth={2.25} />
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
