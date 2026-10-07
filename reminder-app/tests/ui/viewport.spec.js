import { test, expect } from '@playwright/test';

test('可用高度縮小時登入及提醒表單仍可捲動，畫面與操作不超出 viewport', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 420 });
  await page.route('https://identitytoolkit.googleapis.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '常用捷徑管理' })).toBeVisible();
  expect((await page.getByRole('heading', { name: '常用捷徑管理' }).boundingBox()).y).toBeGreaterThanOrEqual(0);
  await page.getByRole('button', { name: '先以訪客身分體驗' }).click();
  await expect(page.getByRole('main')).toBeVisible();
  expect((await page.getByRole('main').boundingBox()).height).toBe(420);
  await page.setViewportSize({ width: 393, height: 760 });
  await page.getByRole('button', { name: '待辦提醒', exact: true }).click();
  await page.getByRole('button', { name: '新增事項', exact: true }).click();
  await page.getByLabel('事項內容').fill('視窗縮小後仍可儲存');
  // Android reserves IME/system bars outside the WebView; emulate the resulting smaller viewport.
  await page.setViewportSize({ width: 393, height: 360 });
  const dialog = page.getByRole('dialog', { name: '新增提醒事項' });
  const bounds = await dialog.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(360);
  const save = page.getByRole('button', { name: '記下來', exact: true });
  await save.scrollIntoViewIfNeeded();
  const saveBounds = await save.boundingBox();
  expect(saveBounds.y + saveBounds.height).toBeLessThanOrEqual(360);
  await save.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '視窗縮小後仍可儲存' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 393, height: 760 });
  expect((await page.getByRole('main').boundingBox()).height).toBe(760);
});

test('長清單只捲動內容區，頂列保持可用，底部事項及設定仍可操作', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 740 });
  await page.route('https://identitytoolkit.googleapis.com/**', route => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('CapacitorStorage.remember-local-tasks-v1', JSON.stringify(Array.from({ length: 12 }, (_, index) => ({ id: `viewport-${index}`, title: `第 ${index + 1} 件事項`, note: '', dueDate: '2030-12-31', reminderTime: '09:00', intervalDays: 1, anchorDate: '2030-12-01', createdAt: index, completed: false }))));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '我的資料夾', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '待辦提醒', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(12);
  const main = page.getByRole('main');
  await main.evaluate(element => { element.scrollTop = element.scrollHeight; });
  expect(await main.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY === 0 && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  await expect(page.getByRole('button', { name: '開啟功能選單', exact: true })).toBeInViewport();
  const last = page.getByRole('heading', { name: '第 1 件事項', exact: true }).locator('xpath=ancestor::article');
  const bounds = await last.boundingBox();
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(740 - 80);
  await page.getByRole('button', { name: '編輯「第 1 件事項」', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '修改提醒事項' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '我的捷徑', exact: true }).click();
  await expect(page.getByRole('heading', { name: '我的資料夾', exact: true })).toBeVisible();
});
