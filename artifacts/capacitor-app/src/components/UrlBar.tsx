import React, { useState, useRef, useEffect } from 'react';
import { useColors, useColorScheme } from '../hooks/useColors';
import { useBrowser, normalizeUrl, getDisplayUrl } from '../context/BrowserContext';

export const URL_BAR_CONTENT_HEIGHT = 38;
export const URL_BAR_BOTTOM_PAD = 10;

export default function UrlBar() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const { currentUrl, navigate, isLoading } = useBrowser();

  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = getDisplayUrl(currentUrl);
  const isHttps = currentUrl.startsWith('https://');

  useEffect(() => {
    if (focused) {
      setInputValue(currentUrl);
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
        background: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(242,242,247,0.85)',
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
            <span className="urlbar-lock">
              {isHttps ? '🔒' : '🌐'}
            </span>
            <span className="urlbar-text" style={{ color: colors.foreground }}>
              {displayUrl}
            </span>
            {isLoading && <span className="urlbar-spinner" />}
          </button>
        ) : (
          <form className="urlbar-form" onSubmit={handleSubmit}>
            <div
              className="urlbar-input-container"
              style={{ background: colors.urlBar, height: URL_BAR_CONTENT_HEIGHT }}
            >
              <span className="urlbar-search-icon">🔍</span>
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
                >
                  ✕
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
