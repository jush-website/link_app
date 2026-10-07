import { test, expect } from '@playwright/test';

const api = 'https://api.github.com/repos/jush-website/link_app/releases?per_page=30';
const download = 'https://github.com/jush-website/link_app/releases/download/link-app-v0.4.0/Download-LinkApp-Windows.cmd';
const release = { tag_name: 'link-app-v0.4.0', draft: false, prerelease: true, assets: [{ name: 'Download-LinkApp-Windows.cmd', size: 4000, state: 'uploaded', browser_download_url: download }] };

async function desktop(page) {
  await page.route('https://identitytoolkit.googleapis.com/**', route => route.abort());
  await page.addInitScript(() => {
    window.reminderDesktop = {
      getAppInfo: async () => ({ version: '0.3.0', platform: 'windows' }),
      openUpdate: async url => { window.updateDownload = url; },
      schedule: async () => ({}), testNotification: async () => ({}),
    };
  });
}

test('啟動自動提示新版，收起後可重查與下載；提醒編輯不受干擾', async ({ page }) => {
  await desktop(page);
  let requests = 0;
  await page.route(api, route => { requests++; return route.fulfill({ json: [release] }); });
  await page.goto('/');
  const updates = page.getByRole('complementary', { name: '應用程式更新' });
  await expect(updates.getByRole('heading', { name: '有新版 0.4.0' })).toBeVisible();
  await expect(updates.getByText('目前版本 0.3.0', { exact: false })).toBeVisible();
  expect(requests).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(updates.getByRole('button', { name: '下載更新' })).toBeVisible();
  expect(requests).toBe(1);
  await updates.getByRole('button', { name: '收起更新提示' }).click();
  await expect(updates.getByRole('heading')).toHaveCount(0);
  await updates.getByRole('button', { name: '新版 0.4.0' }).click();
  await expect.poll(() => requests).toBe(2);
  await updates.getByRole('button', { name: '下載更新' }).click();
  await expect.poll(() => page.evaluate(() => window.updateDownload)).toBe(download);
  await page.getByRole('button', { name: '先以訪客身分體驗' }).click();
  await page.getByRole('button', { name: /^待辦提醒/ }).click();
  await page.getByRole('button', { name: '新增事項', exact: true }).click();
  await page.getByLabel('事項內容').fill('提醒和更新分開運作');
  await page.getByRole('button', { name: '記下來', exact: true }).click();
  await expect(page.getByRole('heading', { name: '提醒和更新分開運作', exact: true })).toBeVisible();
});

test('無新版／離線／手動重試狀態明確，手機寬度不溢出', async ({ page }) => {
  await desktop(page);
  await page.setViewportSize({ width: 393, height: 851 });
  let offline = false;
  await page.route(api, route => offline ? route.abort() : route.fulfill({ json: [] }));
  await page.goto('/');
  const updates = page.getByRole('complementary', { name: '應用程式更新' });
  await updates.getByRole('button', { name: '檢查更新', exact: true }).click();
  await expect(updates.getByText('目前已是最新版本。', { exact: true })).toBeVisible();
  offline = true;
  await updates.getByRole('button', { name: '檢查更新', exact: true }).click();
  await expect(updates.getByRole('status')).not.toContainText('目前已是最新版本');
  await expect(updates.getByRole('status')).not.toContainText('正在檢查');
  offline = false;
  await updates.getByRole('button', { name: '檢查更新', exact: true }).click();
  await expect(updates.getByText('目前已是最新版本。', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
