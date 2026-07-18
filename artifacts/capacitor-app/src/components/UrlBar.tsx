import React, { useState, useRef, useEffect } from 'react';
import { Lock, Globe, Search, X } from 'lucide-react';
import { useColors, useColorScheme } from '../hooks/useColors';
import { useBrowser, normalizeUrl, getDisplayUrl, HOME_URL } from '../context/BrowserContext';

export const URL_BAR_CONTENT_HEIGHT = 40;
export const URL_BAR_BOTTOM_PAD = 10;

export default function UrlBar() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const { currentUrl, navigate, isLoading } = useBrowser();

  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isHome = currentUrl === HOME_URL;
  const displayUrl = getDisplayUrl(currentUrl);
  const isHttps = currentUrl.startsWith('https://');

  useEffect(() => {
    if (focused) {
      setInputValue(isHome ? '' : currentUrl);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [focused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    navigate(normalizeUrl(inputValue));
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleCancel = () => {
    setFocused(false);
    setInputValue('');
    inputRef.current?.blur();
  };

  return (
    <div
      className="urlbar"
      style={{
        background: isDark ? 'rgba(28,28,30,0.72)' : 'rgba(248,248,250,0.72)',
        paddingBottom: URL_BAR_BOTTOM_PAD,
      }}
    >
      <div className="urlbar-row">
        {!focused ? (
          <button
            className="urlbar-pill"
            style={{ background: colors.urlBar, height: URL_BAR_CONTENT_HEIGHT }}
            onClick={() => setFocused(true)}
          >
            <span className="urlbar-lock" style={{ color: colors.mutedForeground }}>
              {isHome ? (
                <Search size={13} strokeWidth={2.25} />
              ) : isHttps ? (
                <Lock size={13} strokeWidth={2.5} />
              ) : (
                <Globe size={13} strokeWidth={2.25} />
              )}
            </span>
            <span
              className="urlbar-text"
              style={{ color: isHome ? colors.mutedForeground : colors.foreground }}
            >
              {isHome ? 'Search or enter address' : displayUrl}
            </span>
            {isLoading && <span className="urlbar-spinner" style={{ borderColor: colors.mutedForeground }} />}
          </button>
        ) : (
          <form className="urlbar-form" onSubmit={handleSubmit}>
            <div
              className="urlbar-input-container"
              style={{ background: colors.urlBar, height: URL_BAR_CONTENT_HEIGHT }}
            >
              <Search size={15} strokeWidth={2.25} color={colors.mutedForeground} />
              <input
                ref={inputRef}
                className="urlbar-input"
                style={{ color: colors.foreground }}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => {
                  if (!inputValue.trim()) setFocused(false);
                }}
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="url"
                placeholder="Search or enter address"
              />
              {inputValue.length > 0 && (
                <button
                  type="button"
                  className="urlbar-clear"
                  onClick={() => setInputValue('')}
                  style={{ color: colors.mutedForeground }}
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <button
              type="button"
              className="urlbar-cancel"
              style={{ color: colors.primary }}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
