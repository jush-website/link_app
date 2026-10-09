import { test, expect } from '@playwright/test';

const api = 'https://api.github.com/repos/jush-website/link_app/releases?per_page=30';
const base = 'https://github.com/jush-website/link_app/releases/download/link-app-v';
const release = version => ({ tag_name: `link-app-v${version}`, draft: false, prerelease: true, assets: ['Download-LinkApp-Windows.cmd', `LinkApp-${version}-android-debug.apk`].map(name => ({ name, state: 'uploaded', size: 4000, browser_download_url: `${base}${version}/${name}` })) });

test('網站不需登入即可下載平台最新版，內含 Android 登入設定，進入主畫面仍可下載', async ({ page }) => {
  await page.route('https://identitytoolkit.googleapis.com/**', route => route.abort());
  await page.route(api, route => route.fulfill({ json: [release('0.4.0'), release('0.5.0'), { ...release('0.6.0'), draft: true }] }));
  await page.goto('/');
  await page.getByRole('button', { name: '下載工具', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '下載桌面工具與手機 App' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: '下載 Windows 工具' })).toHaveAttribute('href', `${base}0.5.0/Download-LinkApp-Windows.cmd`);
  await expect(dialog.getByRole('link', { name: '下載 Android APK' })).toHaveAttribute('href', `${base}0.5.0/LinkApp-0.5.0-android-debug.apk`);
  await dialog.getByText('Android Google 登入設定', { exact: true }).click();
  await expect(dialog.getByText('com.jush.remember', { exact: true })).toBeVisible();
  await expect(dialog.getByText('5A:C8:FD:56:4D:FE:E1:60:8E:EB:6B:E9:D7:B2:58:04:3D:60:9C:D9', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Firebase 專案設定' })).toHaveAttribute('href', 'https://console.firebase.google.com/project/link-4339d/settings/general');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下載工具', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '先以訪客身分體驗' }).click();
  await page.getByRole('button', { name: '下載工具', exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // 待辦提醒頁：下載工具在頂列，新增事項改為右下角浮動按鈕。
  await page.getByRole('button', { name: /^待辦提醒/ }).click();
  await expect(page.getByRole('complementary', { name: '工具下載' })).toHaveCount(0);
  const header = page.getByRole('region', { name: '待辦提醒' }).locator('header');
  await header.getByRole('button', { name: '下載工具', exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  const add = page.getByRole('button', { name: '新增事項', exact: true });
  await expect(add).toHaveCSS('position', 'fixed');
  await expect(header.getByRole('button', { name: '新增事項', exact: true })).toHaveCount(0);
});

test('查詢失敗仍可下載已發布版，393px 手機版不溢出且可關閉', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.route('https://identitytoolkit.googleapis.com/**', route => route.abort());
  await page.route(api, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: '下載工具', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '下載桌面工具與手機 App' });
  await expect(dialog.getByRole('status')).toHaveText('暫時無法查詢新版，仍可下載已發布的安裝包。');
  await expect(dialog.getByRole('link', { name: '下載 Windows 工具' })).toHaveAttribute('href', `${base}0.4.0/Download-LinkApp-Windows.cmd`);
  await expect(dialog.getByRole('link', { name: '下載 Android APK' })).toHaveAttribute('href', `${base}0.5.0/LinkApp-0.5.0-android.apk`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile-tool-downloads.png', fullPage: true });
  await dialog.getByRole('button', { name: '關閉工具下載' }).click();
  await expect(dialog).toHaveCount(0);
});
