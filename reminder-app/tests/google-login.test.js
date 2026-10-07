import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const { startGoogleLogin } = createRequire(import.meta.url)('../electron/google-login.cjs');

test('桌面 Google 回傳需正確 nonce 與 Origin，驗證完成便關閉端點', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'link-google-'));
  await writeFile(join(directory, 'desktop-login.html'), '<h1>Google login</h1>');
  let open;
  const opened = new Promise(resolve => { open = resolve; });
  const result = startGoogleLogin({ directory, openExternal: open });
  const url = new URL(await opened);
  const endpoint = `${url.origin}/desktop-auth/callback`;
  try {
    const page = await fetch(url);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Google login/);
    const post = (nonce, origin, body = { idToken: 'test-google-id-token' }) => fetch(endpoint, { method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${nonce}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post('incorrect', url.origin)).status, 403);
    assert.equal((await post(url.hash.slice(1), 'https://other.example')).status, 403);
    assert.equal((await post(url.hash.slice(1), url.origin, {})).status, 400);
    assert.equal((await fetch(`${url.origin}/../package.json`)).status, 404);
    assert.equal((await post(url.hash.slice(1), url.origin)).status, 200);
    assert.deepEqual(await result, { idToken: 'test-google-id-token', accessToken: null });
    await assert.rejects(fetch(endpoint));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('桌面登入逾時會結束，不保留回傳服務', async () => {
  let open;
  const opened = new Promise(resolve => { open = resolve; });
  const result = startGoogleLogin({ directory: tmpdir(), openExternal: open, timeoutMs: 80 });
  const rejection = assert.rejects(result, error => error.code === 'google/cancelled');
  const url = new URL(await opened);
  await rejection;
  await assert.rejects(fetch(url));
});
