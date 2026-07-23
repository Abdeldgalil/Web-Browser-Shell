import React, { useState } from 'react';
import { Download, Trash2, Share2, RefreshCw, FileDown } from 'lucide-react';
import { Share } from '@capacitor/share';
import { useColors } from '../hooks/useColors';
import { useBrowser } from '../context/BrowserContext';

interface DetectedItem {
  url: string;
  type: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  canScanPage: boolean;
  onScanPage: () => Promise<DetectedItem[]>;
}

function filenameOf(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || url);
  } catch {
    return url;
  }
}

export default function DownloadsModal({ visible, onClose, canScanPage, onScanPage }: Props) {
  const colors = useColors();
  const browserCtx = useBrowser();
  const downloads = browserCtx.downloads ?? [];
  const startDownload = browserCtx.startDownload;
  const removeDownload = browserCtx.removeDownload;
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedItem[]>([]);
  const [scanned, setScanned] = useState(false);

  if (!visible) return null;

  const handleScan = async () => {
    setScanning(true);
    setScanned(false);
    try {
      const items = await onScanPage();
      setDetected(Array.isArray(items) ? items : []);
    } catch {
      setDetected([]);
    } finally {
      setScanning(false);
      setScanned(true);
    }
  };

  const safeDetected = detected ?? [];

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

        <div className="modal-list">
          {canScanPage && (
            <div className="downloads-scan">
              <button
                className="downloads-scan-btn"
                style={{ background: colors.muted, color: colors.foreground }}
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? (
                  <RefreshCw size={16} strokeWidth={2.25} className="downloads-spin" />
                ) : (
                  <FileDown size={16} strokeWidth={2.25} />
                )}
                <span>{scanning ? 'Scanning page…' : 'Scan page for downloads'}</span>
              </button>

              {scanned && safeDetected.length === 0 && (
                <div className="downloads-empty-hint" style={{ color: colors.mutedForeground }}>
                  No downloadable media found on this page.
                </div>
              )}

              {safeDetected.map((item) => (
                <div key={item.url} className="downloads-detected-row" style={{ borderBottomColor: colors.border }}>
                  <div className="modal-favicon" style={{ background: colors.muted }}>
                    📄
                  </div>
                  <div className="modal-info">
                    <div className="modal-item-title" style={{ color: colors.foreground }}>
                      {filenameOf(item.url)}
                    </div>
                    <div className="modal-item-meta" style={{ color: colors.mutedForeground }}>
                      {(item.type || '').toUpperCase()}
                    </div>
                  </div>
                  <button
                    className="downloads-action-btn"
                    style={{ color: colors.primary }}
                    onClick={() => startDownload?.(item.url)}
                  >
                    <Download size={18} strokeWidth={2.25} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {downloads.length === 0 ? (
            <div className="modal-empty">
              <div className="modal-empty-icon">⬇️</div>
              <div className="modal-empty-title" style={{ color: colors.foreground }}>
                No Downloads Yet
              </div>
              <div className="modal-empty-subtitle" style={{ color: colors.mutedForeground }}>
                Scan a page above to find downloadable files.
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
