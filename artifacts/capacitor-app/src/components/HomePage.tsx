import React, { useEffect, useState } from 'react';
import {
  Search,
  Youtube,
  Facebook,
  Twitter,
  Instagram,
  Newspaper,
  ScanLine,
  Globe,
  Pencil,
  Check,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { useColors } from '../hooks/useColors';
import { useSearchSuggestions } from '../hooks/useSearchSuggestions';
import { useBrowser, normalizeUrl, Shortcut } from '../context/BrowserContext';

const ICON_MAP: Record<string, any> = {
  youtube: Youtube,
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  wikipedia: Newspaper,
  amazon: Newspaper,
  generic: Globe,
};

const COLOR_MAP: Record<string, string> = {
  youtube: '#FF0000',
  facebook: '#1877F2',
  twitter: '#000000',
  instagram: '#E4405F',
  wikipedia: '#666666',
  amazon: '#FF9900',
};

function genericColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

interface NewsItem {
  title: string;
  link: string;
  image?: string;
}

function getBackgroundUrl(): string {
  const seed = Math.floor(Math.random() * 1000);
  return `https://picsum.photos/seed/${seed}/800/1600`;
}

export default function HomePage() {
  const colors = useColors();
  const { navigate, bookmarks, shortcuts, addShortcut, removeShortcut, moveShortcut } = useBrowser();
  const [value, setValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { suggestions, debugError } = useSearchSuggestions(searchFocused ? value : '');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsError, setNewsError] = useState(false);
  const [bgUrl] = useState(getBackgroundUrl);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const feedUrl = encodeURIComponent('https://feeds.bbci.co.uk/news/world/rss.xml');
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.items) {
          setNews(
            data.items.slice(0, 8).map((it: any) => ({
              title: it.title,
              link: it.link,
              image: it.thumbnail || it.enclosure?.link || undefined,
            }))
          );
        } else {
          setNewsError(true);
        }
      })
      .catch(() => setNewsError(true));
  }, []);

  const go = (v: string) => {
    navigate(normalizeUrl(v));
    setSearchFocused(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    go(value);
  };

  const handleScanQr = async () => {
    if (!isNative) return;
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') return;
      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
      const result = barcodes[0]?.rawValue;
      if (result) go(result);
    } catch {
      // user cancelled the scan or camera unavailable — do nothing
    }
  };

  const handleAddShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    addShortcut(newName, newUrl);
    setNewName('');
    setNewUrl('');
    setShowAddForm(false);
  };

  return (
    <div className="home-page">
      <img
        src={bgUrl}
        alt=""
        className="home-bg-image"
        style={{ opacity: bgLoaded ? 1 : 0 }}
        onLoad={() => setBgLoaded(true)}
      />
      <div className="home-bg-overlay" />

      <div className="home-content">
        <div className="home-header">
          <div className="home-logo" style={{ background: colors.primary }}>
            🧭
          </div>
          <div className="home-title">Web Browser Shell</div>

          <form className="home-search-form" onSubmit={handleSubmit}>
            <div className="home-search-row">
              <div className="home-search-container">
                <Search size={16} strokeWidth={2.25} color="rgba(255,255,255,0.7)" />
                <input
                  className="home-search-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="url"
                  placeholder="Search Google or enter address"
                />
              </div>
              {isNative && (
                <button type="button" className="home-qr-btn" onClick={handleScanQr} aria-label="Scan QR code">
                  <ScanLine size={19} strokeWidth={2.25} color="#fff" />
                </button>
              )}
            </div>

            {searchFocused && (suggestions.length > 0 || debugError) && (
              <div className="home-suggestions">
                {debugError && (
                  <div style={{ padding: '10px 14px', fontSize: 12, color: '#ff6b6b' }}>Debug: {debugError}</div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="home-suggestion-row"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(s)}
                  >
                    <Search size={14} strokeWidth={2.25} color="rgba(255,255,255,0.7)" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Quick sites — customizable */}
        <div className="home-section">
          <div className="home-section-header">
            <div className="home-section-title">Quick Sites</div>
            <button className="home-edit-toggle" onClick={() => setEditMode((v) => !v)}>
              {editMode ? <Check size={14} strokeWidth={2.5} /> : <Pencil size={13} strokeWidth={2.25} />}
              <span>{editMode ? 'Done' : 'Edit'}</span>
            </button>
          </div>
          <div className="home-grid">
            {shortcuts.map((site: Shortcut, idx: number) => {
              const Icon = ICON_MAP[site.iconKey] || Globe;
              const color = COLOR_MAP[site.iconKey] || genericColor(site.url);
              return (
                <div key={site.id} className="home-shortcut-wrap">
                  {editMode && (
                    <>
                      <button className="home-shortcut-remove" onClick={() => removeShortcut(site.id)}>
                        <X size={11} strokeWidth={3} />
                      </button>
                      <div className="home-shortcut-move">
                        <button disabled={idx === 0} onClick={() => moveShortcut(site.id, -1)}>
                          <ChevronLeft size={12} strokeWidth={3} />
                        </button>
                        <button disabled={idx === shortcuts.length - 1} onClick={() => moveShortcut(site.id, 1)}>
                          <ChevronRight size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </>
                  )}
                  <button
                    className="home-shortcut"
                    onClick={() => !editMode && navigate(site.url)}
                    disabled={editMode}
                  >
                    <div className="home-shortcut-icon" style={{ background: color }}>
                      <Icon size={20} color="#fff" strokeWidth={2} />
                    </div>
                    <span className="home-shortcut-label">{site.name}</span>
                  </button>
                </div>
              );
            })}

            <button className="home-shortcut" onClick={() => setShowAddForm(true)}>
              <div className="home-shortcut-icon home-shortcut-add-icon">
                <Plus size={22} color="#fff" strokeWidth={2.25} />
              </div>
              <span className="home-shortcut-label">Add</span>
            </button>
          </div>
        </div>

        {/* Bookmarks / app shortcuts */}
        {bookmarks.length > 0 && (
          <div className="home-section">
            <div className="home-section-title">Your Bookmarks</div>
            <div className="home-grid">
              {bookmarks.slice(0, 8).map((b) => (
                <button key={b.id} className="home-shortcut" onClick={() => navigate(b.url)}>
                  <div className="home-shortcut-icon home-shortcut-icon-muted">🌐</div>
                  <span className="home-shortcut-label">{b.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* News */}
        <div className="home-section home-news-card">
          <div className="home-section-title">Top Stories</div>
          {newsError ? (
            <div className="home-news-error">Couldn't load news right now.</div>
          ) : news.length === 0 ? (
            <div className="home-news-error">Loading news…</div>
          ) : (
            <div className="home-news-list">
              {news.map((item, i) => (
                <button key={i} className="home-news-item" onClick={() => navigate(item.link)}>
                  {item.image ? (
                    <img src={item.image} className="home-news-thumb" alt="" />
                  ) : (
                    <div className="home-news-thumb home-news-thumb-fallback">
                      <Newspaper size={18} strokeWidth={2} color="rgba(255,255,255,0.6)" />
                    </div>
                  )}
                  <span className="home-news-title">{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="modal-backdrop" onClick={() => setShowAddForm(false)}>
          <div className="modal-sheet add-shortcut-sheet" style={{ background: colors.card }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" style={{ background: colors.border }} />
            <div className="modal-header" style={{ borderBottomColor: colors.border }}>
              <span className="modal-title" style={{ color: colors.foreground }}>
                Add Shortcut
              </span>
              <button className="modal-close" style={{ background: colors.muted }} onClick={() => setShowAddForm(false)}>
                ✕
              </button>
            </div>
            <form className="add-shortcut-form" onSubmit={handleAddShortcut}>
              <input
                className="add-shortcut-input"
                style={{ background: colors.muted, color: colors.foreground }}
                placeholder="Name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="add-shortcut-input"
                style={{ background: colors.muted, color: colors.foreground }}
                placeholder="Website address"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                autoFocus
              />
              <button type="submit" className="add-shortcut-submit" style={{ background: colors.primary }}>
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
