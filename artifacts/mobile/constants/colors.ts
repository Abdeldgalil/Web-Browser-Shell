/**
 * Mobile Browser — design tokens.
 * Inspired by Safari / Arc Browser: clean, dark-mode-first, iOS blue accent.
 */

const colors = {
  light: {
    text: '#1C1C1E',
    tint: '#007AFF',
    background: '#F2F2F7',
    foreground: '#1C1C1E',
    card: '#FFFFFF',
    cardForeground: '#1C1C1E',
    primary: '#007AFF',
    primaryForeground: '#FFFFFF',
    secondary: '#E5E5EA',
    secondaryForeground: '#1C1C1E',
    muted: '#E5E5EA',
    mutedForeground: '#6C6C70',
    accent: '#007AFF',
    accentForeground: '#FFFFFF',
    destructive: '#FF3B30',
    destructiveForeground: '#FFFFFF',
    border: '#C6C6C8',
    input: '#E5E5EA',
    urlBar: '#E5E5EA',
  },
  dark: {
    text: '#FFFFFF',
    tint: '#0A84FF',
    background: '#000000',
    foreground: '#FFFFFF',
    card: '#1C1C1E',
    cardForeground: '#FFFFFF',
    primary: '#0A84FF',
    primaryForeground: '#FFFFFF',
    secondary: '#2C2C2E',
    secondaryForeground: '#FFFFFF',
    muted: '#2C2C2E',
    mutedForeground: '#8E8E93',
    accent: '#0A84FF',
    accentForeground: '#FFFFFF',
    destructive: '#FF453A',
    destructiveForeground: '#FFFFFF',
    border: '#3A3A3C',
    input: '#2C2C2E',
    urlBar: '#1C1C1E',
  },
  radius: 12,
};

export default colors;
