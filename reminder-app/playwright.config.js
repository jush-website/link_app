import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    timezoneId: 'Asia/Taipei',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      env: { ...process.env, XDG_CACHE_HOME: '/tmp/remember-browser-cache', XDG_CONFIG_HOME: '/tmp/remember-browser-config' },
    },
  },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI },
  reporter: 'list',
});
