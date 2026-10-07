import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, createUpdateChecker, isUpdateDownload, RELEASES_URL, RETRY_INTERVAL, selectUpdate, UPDATE_INTERVAL } from '../src/updates.js';

function release(version, { platform = 'both', draft = false, prerelease = true } = {}) {
  const names = [];
  if (platform !== 'android') names.push('Download-LinkApp-Windows.cmd');
  if (platform !== 'windows') names.push(`LinkApp-${version}-android-debug.apk`);
  return { tag_name: `link-app-v${version}`, draft, prerelease, assets: names.map(name => ({ name, size: 4000, state: 'uploaded', browser_download_url: `https://github.com/jush-website/link_app/releases/download/link-app-v${version}/${name}` })) };
}
const installed = { version: '0.3.0', platform: 'windows' };

test('數字版本比較：0.10.0 大於 0.9.9，同版或舊版不提示', () => {
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1);
  assert.equal(compareVersions('1.0.0', '0.99.0'), 1);
  assert.equal(compareVersions('0.3.0', '0.3.0'), 0);
  assert.equal(selectUpdate([release('0.2.0'), release('0.3.0')], installed), null);
  assert.throws(() => compareVersions('bad-version', '0.3.0'));
});

test('選出平台最高的已發布相容版，忽略草稿、無對應安裝包與舊獨立版', () => {
  const releases = [release('0.10.0', { platform: 'android' }), release('9.0.0', { draft: true }), release('0.4.0'), release('0.9.0'), { tag_name: 'remember-v9.0.0', assets: release('9.0.0').assets }];
  const windows = selectUpdate(releases, installed);
  assert.equal(windows.version, '0.9.0');
  assert.equal(windows.assetName, 'Download-LinkApp-Windows.cmd');
  const android = selectUpdate(releases, { ...installed, platform: 'android' });
  assert.equal(android.version, '0.10.0');
  assert.equal(android.assetName, 'LinkApp-0.10.0-android-debug.apk');
  assert.equal(android.prerelease, true);
});

test('拒絕任意下載、不同 repository／版本、未完成的 asset 及錯誤 feed', () => {
  for (const url of ['javascript:alert(1)', 'http://github.com/jush-website/link_app/releases/download/link-app-v0.4.0/Download-LinkApp-Windows.cmd', 'https://github.com.evil.test/jush-website/link_app/releases/download/link-app-v0.4.0/Download-LinkApp-Windows.cmd', 'https://github.com/other/repo/releases/download/link-app-v0.4.0/Download-LinkApp-Windows.cmd', 'https://user:pass@github.com/jush-website/link_app/releases/download/link-app-v0.4.0/Download-LinkApp-Windows.cmd', 'https://github.com/jush-website/link_app/releases/download/link-app-v0.4.0/other.exe']) assert.equal(isUpdateDownload(url), false);
  const data = release('0.4.0');
  data.assets[0].browser_download_url = data.assets[0].browser_download_url.replace('0.4.0', '0.5.0');
  assert.equal(selectUpdate([data], installed), null);
  data.assets[0].browser_download_url = release('0.4.0').assets[0].browser_download_url;
  data.assets[0].state = 'new';
  assert.equal(selectUpdate([data], installed), null);
  assert.throws(() => selectUpdate({ message: 'API error' }, installed));
});

test('啟動／恢復檢查共用請求與六小時快取，手動檢查會刷新', async () => {
  let now = 1000, requests = 0, finish;
  const checker = createUpdateChecker({ ...installed, clock: () => now, fetcher: async (url, options) => {
    assert.equal(url, RELEASES_URL);
    assert.equal(options.credentials, 'omit');
    requests++;
    if (requests === 1) await new Promise(resolve => { finish = resolve; });
    return { ok: true, json: async () => [release('0.4.0')] };
  } });
  const first = checker.check(), second = checker.check();
  assert.equal(first, second);
  finish();
  assert.equal((await first).candidate.version, '0.4.0');
  now += 1;
  await checker.check(); assert.equal(requests, 1);
  now += UPDATE_INTERVAL;
  await checker.check(); assert.equal(requests, 2);
  await checker.check({ force: true }); assert.equal(requests, 3);
});

test('離線或受限不誤報最新版，也不丟掉已找到的新版，十五分鐘後重試', async () => {
  let now = 1000, requests = 0;
  const checker = createUpdateChecker({ ...installed, clock: () => now, fetcher: async () => {
    requests++;
    return requests === 1 ? { ok: true, json: async () => [release('0.4.0')] } : { ok: false, status: 403 };
  } });
  await checker.check();
  const result = await checker.check({ force: true });
  assert.match(result.error, /受限/);
  assert.equal(result.candidate.version, '0.4.0');
  now += RETRY_INTERVAL - 1;
  await checker.check(); assert.equal(requests, 2);
  now += 1;
  await checker.check(); assert.equal(requests, 3);
  const offline = createUpdateChecker({ ...installed, fetcher: async () => { throw new Error('離線'); } });
  assert.equal((await offline.check()).candidate, null);
  assert.equal((await offline.check()).checkedAt, null);
});

test('更新檢查有逾時，終止掛住請求並允許手動重試', async () => {
  const checker = createUpdateChecker({ ...installed, timeout: 25, fetcher: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))) });
  assert.match((await checker.check()).error, /逾時/);
  assert.match((await checker.check({ force: true })).error, /逾時/);
});
