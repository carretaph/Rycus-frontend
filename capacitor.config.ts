import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rycus.app',
  appName: 'Rycus',
  webDir: 'dist',
  server: {
    url: 'http://localhost:5173', // ✅ FIX
    cleartext: true,
  },
};

export default config;