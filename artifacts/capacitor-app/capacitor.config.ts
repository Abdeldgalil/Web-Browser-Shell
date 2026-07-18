import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.browser.app',
  appName: 'Browser',
  webDir: 'dist',
  server: {
    // During development, point to your Vite dev server if needed.
    // Leave empty for production builds.
  },
  plugins: {
    CapacitorInAppBrowser: {},
  },
};

export default config;
