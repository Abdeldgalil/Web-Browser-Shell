import React from 'react';
import { useColors } from '../hooks/useColors';
import { useBrowser, Bookmark, getDisplayUrl } from '../context/BrowserContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BookmarksModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { bookmarks, navigate, removeBookmark } = useBrowser();

  if (!visible) return null;

  const handleNavigate = (url: string) => {
    navigate(url);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ background: colors.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" style={{ background: colors.border }} />
        <div className="modal-header" style={{ borderBottomColor: colors.border }}>
          <span className="modal-title" style={{ color: colors.foreground }}>
            Bookmarks
          </span>
          <button className="modal-close" style={{ background: colors.muted }} onClick={onClose}>
            ✕
          </button>
        </div>

        {bookmarks.length === 0 ? (
          <div className="modal-empty">
            <div className="modal-empty-icon">🔖</div>
            <div className="modal-empty-title" style={{ color: colors.foreground }}>
              No Bookmarks
            </div>
            <div className="modal-empty-subtitle" style={{ color: colors.mutedForeground }}>
              Tap the bookmark icon while browsing to save pages.
            </div>
          </div>
        ) : (
          <div className="modal-list">
            {bookmarks.map((item: Bookmark) => (
              <div
                key={item.id}
                className="modal-row"
                style={{ borderBottomColor: colors.border }}
                onClick={() => handleNavigate(item.url)}
              >
                <div className="modal-favicon" style={{ background: colors.muted }}>
                  🌐
                </div>
                <div className="modal-info">
                  <div className="modal-item-title" style={{ color: colors.foreground }}>
                    {item.title}
                  </div>
                  <div className="modal-item-url" style={{ color: colors.mutedForeground }}>
                    {getDisplayUrl(item.url)}
                  </div>
                </div>
                <button
                  className="modal-remove"
                  style={{ color: colors.mutedForeground }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBookmark(item.id);
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
