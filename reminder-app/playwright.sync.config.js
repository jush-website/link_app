import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

export default defineConfig({
  ...base,
  testDir: './tests/sync',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5175' },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    env: { VITE_USE_FIREBASE_EMULATORS: 'true' },
  },
});
