import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useColors } from '../hooks/useColors';
import { useBrowser, normalizeUrl } from '../context/BrowserContext';

export default function HomePage() {
  const colors = useColors();
  const { navigate, bookmarks } = useBrowser();
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    navigate(normalizeUrl(value));
  };

  return (
    <div className="home-page">
      <div className="home-logo" style={{ background: colors.primary }}>
        🧭
      </div>
      <div className="home-title" style={{ color: colors.foreground }}>
        Web Browser Shell
      </div>

      <form className="home-search-form" onSubmit={handleSubmit}>
        <div className="home-search-container" style={{ background: colors.urlBar }}>
          <Search size={16} strokeWidth={2.25} color={colors.mutedForeground} />
          <input
            className="home-search-input"
            style={{ color: colors.foreground }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="url"
            placeholder="Search or enter address"
          />
        </div>
      </form>

      {bookmarks.length > 0 && (
        <div className="home-shortcuts">
          {bookmarks.slice(0, 8).map((b) => (
            <button
              key={b.id}
              className="home-shortcut"
              onClick={() => navigate(b.url)}
              style={{ background: colors.card }}
            >
              <div className="home-shortcut-icon" style={{ background: colors.muted }}>
                🌐
              </div>
              <span className="home-shortcut-label" style={{ color: colors.mutedForeground }}>
                {b.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
