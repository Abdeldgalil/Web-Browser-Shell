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
  image?: string;
}

// A new random photo each time the home page mounts (changes per app open / navigation back home).
function getBackgroundUrl(): string {
  const seed = Math.floor(Math.random() * 1000);
  return `https://picsum.photos/seed/${seed}/800/1600`;
}

export default function HomePage() {
  const colors = useColors();
  const { navigate, bookmarks } = useBrowser();
  const [value, setValue] = useState('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsError, setNewsError] = useState(false);
  const [bgUrl] = useState(getBackgroundUrl);
  const [bgLoaded, setBgLoaded] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    navigate(normalizeUrl(value));
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
            <div className="home-search-container">
              <Search size={16} strokeWidth={2.25} color="rgba(255,255,255,0.7)" />
              <input
                className="home-search-input"
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
          <div className="home-section-title">Quick Sites</div>
          <div className="home-grid">
            {QUICK_SITES.map((site) => {
              const Icon = site.icon;
              return (
                <button key={site.name} className="home-shortcut" onClick={() => navigate(site.url)}>
                  <div className="home-shortcut-icon" style={{ background: site.color }}>
                    <Icon size={20} color="#fff" strokeWidth={2} />
                  </div>
                  <span className="home-shortcut-label">{site.name}</span>
                </button>
              );
            })}
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
    </div>
  );
}
