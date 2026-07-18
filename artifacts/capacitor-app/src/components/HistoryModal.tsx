import React from 'react';
import { useColors } from '../hooks/useColors';
import { useBrowser, HistoryEntry, getDisplayUrl } from '../context/BrowserContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HistoryModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { history, navigate, removeHistoryItem, clearHistory } = useBrowser();

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
            History
          </span>
          <div className="modal-header-actions">
            {history.length > 0 && (
              <button
                className="modal-clear"
                style={{ color: colors.destructive }}
                onClick={clearHistory}
              >
                Clear
              </button>
            )}
            <button className="modal-close" style={{ background: colors.muted }} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="modal-empty">
            <div className="modal-empty-icon">🕘</div>
            <div className="modal-empty-title" style={{ color: colors.foreground }}>
              No History
            </div>
            <div className="modal-empty-subtitle" style={{ color: colors.mutedForeground }}>
              Pages you visit will appear here.
            </div>
          </div>
        ) : (
          <div className="modal-list">
            {history.map((item: HistoryEntry) => (
              <div
                key={item.id}
                className="modal-row"
                style={{ borderBottomColor: colors.border }}
                onClick={() => handleNavigate(item.url)}
              >
                <div className="modal-favicon" style={{ background: colors.muted }}>
                  🕘
                </div>
                <div className="modal-info">
                  <div className="modal-item-title" style={{ color: colors.foreground }}>
                    {item.title}
                  </div>
                  <div className="modal-item-meta" style={{ color: colors.mutedForeground }}>
                    {getDisplayUrl(item.url)} · {formatTimestamp(item.timestamp)}
                  </div>
                </div>
                <button
                  className="modal-remove"
                  style={{ color: colors.mutedForeground }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeHistoryItem(item.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
