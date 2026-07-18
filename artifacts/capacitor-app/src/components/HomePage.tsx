import React, { useEffect, useState } from 'react';
import { Search, Youtube, Facebook, Twitter, Instagram, Newspaper } from 'lucide-react';
import { useColors } from '../hooks/useColors';
import { useBrowser, normalizeUrl } from '../context/BrowserContext';

const QUICK_SITES = [
  { name: 'YouTube', url: 'https://www.youtube.com', icon: Youtube, color: '#FF0000' },
  { name: 'Facebook', url: 'https://www.facebook.com', icon: Facebook, color: '#1877F2' },
  { name: 'Twitter / X', url: 'https://www.x.com', icon: Twitter, color: '#000000' },
  { name: 'Instagram', url: 'https://www.instagram.com', icon: Instagram, color: '#E4405F' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: Newspaper, color: '#666666' },
  { name: 'Amazon', url: 'https://www.amazon.com', icon: Newspaper, color: '#FF9900' },
];

interface NewsItem {
  title: string;
  link: string;
}

export default function HomePage() {
  const colors = useColors();
  const { navigate, bookmarks } = useBrowser();
  const [value, setValue] = useState('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsError, setNewsError] = useState(false);

  useEffect(() => {
    const feedUrl = encodeURIComponent('https://feeds.bbci.co.uk/news/world/rss.xml');
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.items) {
          setNews(
            data.items.slice(0, 6).map((it: any) => ({ title: it.title, link: it.link }))
          );
        } else {
          setNewsError(true);
        }
      })
      .catch(() => setNewsError(true));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    navigate(normalizeUrl(value));
  };

  return (
    <div className="home-page">
      <div className="home-header">
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
              placeholder="Search Google or enter address"
            />
          </div>
        </form>
      </div>

      {/* Quick sites */}
      <div className="home-section">
        <div className="home-section-title" style={{ color: colors.mutedForeground }}>
          Quick Sites
        </div>
        <div className="home-grid">
          {QUICK_SITES.map((site) => {
            const Icon = site.icon;
            return (
              <button
                key={site.name}
                className="home-shortcut"
                onClick={() => navigate(site.url)}
              >
                <div className="home-shortcut-icon" style={{ background: site.color }}>
                  <Icon size={20} color="#fff" strokeWidth={2} />
                </div>
                <span className="home-shortcut-label" style={{ color: colors.mutedForeground }}>
                  {site.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookmarks / app shortcuts */}
      {bookmarks.length > 0 && (
        <div className="home-section">
          <div className="home-section-title" style={{ color: colors.mutedForeground }}>
            Your Bookmarks
          </div>
          <div className="home-grid">
            {bookmarks.slice(0, 8).map((b) => (
              <button key={b.id} className="home-shortcut" onClick={() => navigate(b.url)}>
                <div className="home-shortcut-icon" style={{ background: colors.muted }}>
                  🌐
                </div>
                <span className="home-shortcut-label" style={{ color: colors.mutedForeground }}>
                  {b.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* News */}
      <div className="home-section">
        <div className="home-section-title" style={{ color: colors.mutedForeground }}>
          Top Stories
        </div>
        {newsError ? (
          <div className="home-news-error" style={{ color: colors.mutedForeground }}>
            Couldn't load news right now.
          </div>
        ) : news.length === 0 ? (
          <div className="home-news-error" style={{ color: colors.mutedForeground }}>
            Loading news…
          </div>
        ) : (
          <div className="home-news-list">
            {news.map((item, i) => (
              <button
                key={i}
                className="home-news-item"
                style={{ borderBottomColor: colors.border }}
                onClick={() => navigate(item.link)}
              >
                <Newspaper size={16} strokeWidth={2} color={colors.mutedForeground} />
                <span className="home-news-title" style={{ color: colors.foreground }}>
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
