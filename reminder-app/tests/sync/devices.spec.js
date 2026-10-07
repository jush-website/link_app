import { test, expect } from '@playwright/test';
test('Google 帳號共用捷徑、資料夾及提醒，兩端修改和完成同步且不同帳號隔離', async ({ browser }) => {
  const desktop = await browser.newContext({ timezoneId: 'Asia/Taipei' });
  const mobile = await browser.newContext({ viewport: { width: 393, height: 851 }, timezoneId: 'Asia/Taipei' });
  const stranger = await browser.newContext();
  const first = await desktop.newPage(); const second = await mobile.newPage(); const other = await stranger.newPage();
  const email = 'google-'+Date.now()+'@demo.invalid';
  await desktop.addInitScript(() => {
    window.reminderDesktop = { schedule: async tasks => { window.latestSchedules = tasks; }, testNotification: async () => ({ sent: true }) };
  });
  async function authenticate(page, account) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '使用 Google 帳號登入', exact: true })).toBeVisible();
    await page.evaluate(async email => { await (await import('/tests/fixtures/emulator-auth.js')).loginGoogle(email); }, account);
    await expect(page.getByRole('heading', { name: '我的資料夾', exact: true })).toBeVisible();
    expect(await page.evaluate(async () => (await import('/src/firebase.js')).auth.currentUser.providerData[0].providerId)).toBe('google.com');
  }
  async function reminders(page) {
    await page.getByRole('button', { name: /^待辦提醒/ }).click();
    await expect(page.getByText('雲端已同步', { exact: true })).toBeVisible();
  }
  try {
    await authenticate(first, email); await authenticate(second, email);
    const uid = await first.evaluate(async () => (await import('/src/firebase.js')).auth.currentUser.uid);
    expect(await second.evaluate(async () => (await import('/src/firebase.js')).auth.currentUser.uid)).toBe(uid);
    await first.getByRole('button', { name: '新增資料夾', exact: true }).click();
    await first.getByPlaceholder('例如：設計資源、工作專案...').fill('工作');
    await first.getByRole('button', { name: '建立', exact: true }).click();
    await expect(second.getByRole('heading', { name: '工作', exact: true })).toBeVisible();
    await first.getByRole('button', { name: '新增捷徑', exact: true }).click();
    await first.getByPlaceholder('例如：Google, Figma...').fill('便當店');
    await first.getByPlaceholder('例如：https://...').fill('https://example.com/lunch');
    await first.getByRole('button', { name: '儲存', exact: true }).click();
    await second.getByRole('button', { name: '開啟功能選單', exact: true }).first().click();
    await expect(second.getByRole('link', { name: /便當店/ })).toBeVisible();
    await second.getByRole('button', { name: /^待辦提醒/ }).first().click();
    await expect(second.getByText('雲端已同步', { exact: true })).toBeVisible();
    await reminders(first);
    await first.getByLabel('事項內容').fill('下週一要訂便當');
    await first.getByRole('button', { name: '記下來', exact: true }).click();
    await expect(second.getByRole('heading', { name: '訂便當', exact: true })).toBeVisible();
    await expect.poll(() => first.evaluate(() => window.latestSchedules?.length)).toBe(1);
    await first.screenshot({ path: 'test-results/google-integrated-windows.png', fullPage: true });
    await first.getByRole('button', { name: '我的捷徑', exact: true }).click();
    await mobile.setOffline(true);
    await second.getByRole('button', { name: '編輯「訂便當」' }).click();
    await second.getByLabel('事項內容').fill('訂 12 個便當');
    await second.getByLabel('提醒間隔天數').fill('3');
    await second.getByRole('button', { name: '儲存修改', exact: true }).click();
    await expect(second.getByRole('heading', { name: '訂 12 個便當', exact: true })).toBeVisible();
    await expect(second.getByText('已儲存 · 等待同步', { exact: true })).toBeVisible();
    await mobile.setOffline(false);
    await expect.poll(() => first.evaluate(() => window.latestSchedules?.[0]?.intervalDays)).toBe(3);
    await authenticate(other, 'other-'+Date.now()+'@demo.invalid'); await reminders(other);
    await expect(other.getByRole('heading', { name: '訂 12 個便當', exact: true })).toHaveCount(0);
    const denied = await other.evaluate(async uid => {
      const { auth } = await import('/src/firebase.js');
      const response = await fetch('http://127.0.0.1:8085/v1/projects/demo-remember/databases/(default)/documents/artifacts/my-shortcut-app/users/'+uid+'/reminders', { headers: { Authorization: 'Bearer '+await auth.currentUser.getIdToken() } });
      return response.status;
    }, uid);
    expect(denied).toBe(403);
    await second.getByRole('button', { name: '完成「訂 12 個便當」' }).click();
    await expect.poll(() => first.evaluate(() => window.latestSchedules?.length)).toBe(0);
    await reminders(first); await first.getByRole('button', { name: /^已完成/ }).click();
    await expect(first.getByRole('heading', { name: '訂 12 個便當', exact: true })).toBeVisible();
    await first.getByRole('button', { name: '登出', exact: true }).click();
    await expect(first.getByRole('button', { name: '使用 Google 帳號登入', exact: true })).toBeVisible();
    await expect.poll(() => first.evaluate(() => window.latestSchedules?.length)).toBe(0);
    await authenticate(first, email);
    await expect(first.getByRole('heading', { name: '工作', exact: true })).toBeVisible();
    await expect(first.getByRole('link', { name: /便當店/ })).toBeVisible();
    await reminders(first);
    await first.getByRole('button', { name: /^已完成/ }).click();
    await expect(first.getByRole('heading', { name: '訂 12 個便當', exact: true })).toBeVisible();
  } finally { await desktop.close(); await mobile.close(); await stranger.close(); }
});
