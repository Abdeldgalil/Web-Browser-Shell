import React from 'react';
import { Share2, Search, Monitor, Check, Bookmark, Star, Clock, Languages } from 'lucide-react';
import { useColors } from '../hooks/useColors';
import { useBrowser } from '../context/BrowserContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  onFindInPage: () => void;
  onToggleDesktop: () => void;
  onTranslate: () => void;
  onOpenBookmarks: () => void;
  onOpenHistory: () => void;
  desktopMode: boolean;
  disabled: boolean;
}

export default function MoreMenu({
  visible,
  onClose,
  onShare,
  onFindInPage,
  onToggleDesktop,
  onTranslate,
  onOpenBookmarks,
  onOpenHistory,
  desktopMode,
  disabled,
}: Props) {
  const colors = useColors();
  const { currentUrl, pageTitle, toggleBookmark, isBookmarked } = useBrowser();
  if (!visible) return null;

  const bookmarked = isBookmarked(currentUrl);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet more-menu-sheet"
        style={{ background: colors.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" style={{ background: colors.border }} />
        <div className="more-menu-list">
          <button
            className="more-menu-item"
            style={{ opacity: disabled ? 0.4 : 1 }}
            disabled={disabled}
            onClick={() => run(() => toggleBookmark(currentUrl, pageTitle))}
          >
            <Bookmark
              size={20}
              strokeWidth={2}
              color={colors.foreground}
              fill={bookmarked ? colors.foreground : 'none'}
            />
            <span style={{ color: colors.foreground }}>{bookmarked ? 'Remove Bookmark' : 'Add Bookmark'}</span>
          </button>

          <button className="more-menu-item" onClick={() => run(onOpenBookmarks)}>
            <Star size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground }}>View Bookmarks</span>
          </button>

          <button className="more-menu-item" onClick={() => run(onOpenHistory)}>
            <Clock size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground }}>View History</span>
          </button>

          <div className="more-menu-divider" style={{ background: colors.border }} />

          <button
            className="more-menu-item"
            style={{ opacity: disabled ? 0.4 : 1 }}
            disabled={disabled}
            onClick={() => run(onShare)}
          >
            <Share2 size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground }}>Share Page</span>
          </button>

          <button
            className="more-menu-item"
            style={{ opacity: disabled ? 0.4 : 1 }}
            disabled={disabled}
            onClick={() => run(onFindInPage)}
          >
            <Search size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground }}>Find in Page</span>
          </button>

          <button
            className="more-menu-item"
            style={{ opacity: disabled ? 0.4 : 1 }}
            disabled={disabled}
            onClick={() => run(onTranslate)}
          >
            <Languages size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground }}>Translate Page</span>
          </button>

          <button
            className="more-menu-item"
            style={{ opacity: disabled ? 0.4 : 1 }}
            disabled={disabled}
            onClick={() => run(onToggleDesktop)}
          >
            <Monitor size={20} strokeWidth={2} color={colors.foreground} />
            <span style={{ color: colors.foreground, flex: 1 }}>Request Desktop Site</span>
            {desktopMode && <Check size={18} strokeWidth={2.5} color={colors.primary} />}
          </button>
        </div>
      </div>
    </div>
  );
}
