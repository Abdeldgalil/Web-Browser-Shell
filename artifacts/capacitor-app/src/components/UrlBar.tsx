import React, { useState, useRef, useEffect } from 'react';
import { Lock, Globe, Search, X, VenetianMask, ScanLine } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { useColors, useColorScheme } from '../hooks/useColors';
import { useSearchSuggestions } from '../hooks/useSearchSuggestions';
import { useBrowser, normalizeUrl, getDisplayUrl, HOME_URL } from '../context/BrowserContext';

export const URL_BAR_CONTENT_HEIGHT = 40;
export const URL_BAR_BOTTOM_PAD = 10;

export default function UrlBar() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const { currentUrl, navigate, isLoading, isIncognito } = useBrowser();

  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useSearchSuggestions(focused ? inputValue : '');

  const isHome = currentUrl === HOME_URL;
  const displayUrl = getDisplayUrl(currentUrl);
  const isHttps = currentUrl.startsWith('https://');
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (focused) {
      setInputValue(isHome ? '' : currentUrl);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [focused]);

  const go = (value: string) => {
    navigate(normalizeUrl(value));
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    go(inputValue);
  };

  const handleCancel = () => {
    setFocused(false);
    setInputValue('');
    inputRef.current?.blur();
  };

  const handleScanQr = async () => {
    if (!isNative) return;
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') return;
      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
      const value = barcodes[0]?.rawValue;
      if (value) go(value);
    } catch {
      // user cancelled the scan or camera unavailable — do nothing
    }
  };

  const barBackground = isIncognito
    ? 'rgba(45,27,66,0.85)'
    : isDark
    ? 'rgba(28,28,30,0.72)'
    : 'rgba(248,248,250,0.72)';
  const pillBackground = isIncognito ? 'rgba(255,255,255,0.12)' : colors.urlBar;
  const textColor = isIncognito ? '#fff' : colors.foreground;
  const mutedColor = isIncognito ? 'rgba(255,255,255,0.6)' : colors.mutedForeground;

  return (
    <div className="urlbar" style={{ background: barBackground, paddingBottom: URL_BAR_BOTTOM_PAD }}>
      <div className="urlbar-row">
        {!focused ? (
          <>
            <button
              className="urlbar-pill"
              style={{ background: pillBackground, height: URL_BAR_CONTENT_HEIGHT }}
              onClick={() => setFocused(true)}
            >
              <span className="urlbar-lock" style={{ color: mutedColor }}>
                {isIncognito ? (
                  <span className="incognito-badge incognito-badge-sm">
                    <VenetianMask size={11} strokeWidth={2.25} color="#fff" />
                  </span>
                ) : isHome ? (
                  <Search size={13} strokeWidth={2.25} />
                ) : isHttps ? (
                  <Lock size={13} strokeWidth={2.5} />
                ) : (
                  <Globe size={13} strokeWidth={2.25} />
                )}
              </span>
              <span className="urlbar-text" style={{ color: isHome ? mutedColor : textColor }}>
                {isHome ? 'Search or enter address' : displayUrl}
              </span>
              {isLoading && <span className="urlbar-spinner" style={{ borderColor: mutedColor }} />}
            </button>
            {isNative && (
              <button
                className="urlbar-qr-btn"
                style={{ background: pillBackground, height: URL_BAR_CONTENT_HEIGHT, width: URL_BAR_CONTENT_HEIGHT }}
                onClick={handleScanQr}
                aria-label="Scan QR code"
              >
                <ScanLine size={17} strokeWidth={2.25} color={mutedColor} />
              </button>
            )}
          </>
        ) : (
          <form className="urlbar-form" onSubmit={handleSubmit}>
            <div
              className="urlbar-input-container"
              style={{ background: pillBackground, height: URL_BAR_CONTENT_HEIGHT }}
            >
              <Search size={15} strokeWidth={2.25} color={mutedColor} />
              <input
                ref={inputRef}
                className="urlbar-input"
                style={{ color: textColor }}
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
              {isNative && (
                <button type="button" className="urlbar-qr-inline" onClick={handleScanQr} style={{ color: mutedColor }}>
                  <ScanLine size={16} strokeWidth={2.25} />
                </button>
              )}
              {inputValue.length > 0 && (
                <button type="button" className="urlbar-clear" onClick={() => setInputValue('')} style={{ color: mutedColor }}>
                  <X size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <button type="button" className="urlbar-cancel" style={{ color: colors.primary }} onClick={handleCancel}>
              Cancel
            </button>
          </form>
        )}
      </div>

      {focused && suggestions.length > 0 && (
        <div className="urlbar-suggestions" style={{ background: colors.card }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="urlbar-suggestion-row"
              style={{ borderBottomColor: colors.border }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(s)}
            >
              <Search size={14} strokeWidth={2.25} color={colors.mutedForeground} />
              <span style={{ color: colors.foreground }}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
