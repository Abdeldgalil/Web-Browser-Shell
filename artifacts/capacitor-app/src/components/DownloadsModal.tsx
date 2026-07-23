import React, { useState } from 'react';
import { Trash2, Share2, ArrowDownToLine } from 'lucide-react';
import { Share } from '@capacitor/share';
import { useColors } from '../hooks/useColors';
import { useBrowser } from '../context/BrowserContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function DownloadsModal({ visible, onClose }: Props) {
  const colors = useColors();
  const browserCtx = useBrowser();
  const downloads = browserCtx.downloads ?? [];
  const startDownload = browserCtx.startDownload;
  const removeDownload = browserCtx.removeDownload;
  const [urlInput, setUrlInput] = useState('');

  if (!visible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    startDownload?.(trimmed);
    setUrlInput('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" style={{ background: colors.card }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" style={{ background: colors.border }} />
        <div className="modal-header" style={{ borderBottomColor: colors.border }}>
          <span className="modal-title" style={{ color: colors.foreground }}>
            Downloads
          </span>
          <button className="modal-close" style={{ background: colors.muted }} onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="downloads-input-row" onSubmit={handleSubmit}>
          <input
            className="downloads-input"
            style={{ background: colors.muted, color: colors.foreground }}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste a file link to download"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="url"
          />
          <button type="submit" className="downloads-input-btn" style={{ color: colors.primary }}>
            <ArrowDownToLine size={20} strokeWidth={2.25} />
          </button>
        </form>

        <div className="downloads-hint" style={{ color: colors.mutedForeground }}>
          Tapping a download link or button on any page saves it here automatically.
        </div>

        <div className="modal-list">
          {downloads.length === 0 ? (
            <div className="modal-empty">
              <div className="modal-empty-icon">⬇️</div>
              <div className="modal-empty-title" style={{ color: colors.foreground }}>
                No Downloads Yet
              </div>
              <div className="modal-empty-subtitle" style={{ color: colors.mutedForeground }}>
                Files you download while browsing will show up here.
              </div>
            </div>
          ) : (
            downloads.map((d) => (
              <div key={d.id} className="modal-row" style={{ borderBottomColor: colors.border }}>
                <div className="modal-favicon" style={{ background: colors.muted }}>
                  {d.status === 'done' ? '✅' : d.status === 'error' ? '⚠️' : '⬇️'}
                </div>
                <div className="modal-info">
                  <div className="modal-item-title" style={{ color: colors.foreground }}>
                    {d.filename}
                  </div>
                  {d.status === 'downloading' || d.status === 'queued' ? (
                    <div className="downloads-progress-track" style={{ background: colors.muted }}>
                      <div
                        className="downloads-progress-fill"
                        style={{
                          background: colors.primary,
                          width: d.progress >= 0 ? `${d.progress}%` : '35%',
                        }}
                      />
                    </div>
                  ) : (
                    <div className="modal-item-meta" style={{ color: colors.mutedForeground }}>
                      {d.status === 'done' ? 'Downloaded' : 'Failed'}
                    </div>
                  )}
                </div>
                {d.status === 'done' && (
                  <button
                    className="downloads-action-btn"
                    style={{ color: colors.mutedForeground }}
                    onClick={() => Share.share({ url: d.path, title: d.filename }).catch(() => {})}
                  >
                    <Share2 size={17} strokeWidth={2.25} />
                  </button>
                )}
                <button
                  className="downloads-action-btn"
                  style={{ color: colors.mutedForeground }}
                  onClick={() => removeDownload?.(d.id)}
                >
                  <Trash2 size={17} strokeWidth={2.25} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
