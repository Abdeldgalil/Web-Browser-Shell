import { useEffect, useState } from 'react';
import colors, { ColorScheme, ColorTokens } from '../styles/colors';

function getScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(getScheme());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setScheme(getScheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return scheme;
}

export function useColors(): ColorTokens {
  const scheme = useColorScheme();
  return colors[scheme];
}
