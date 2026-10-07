export const RELEASES_URL = 'https://api.github.com/repos/jush-website/link_app/releases?per_page=30';
export const UPDATE_INTERVAL = 6 * 60 * 60 * 1000;
export const RETRY_INTERVAL = 15 * 60 * 1000;
const VERSION = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/;

export function compareVersions(left, right) {
  if (!VERSION.test(left) || !VERSION.test(right)) throw new Error('版本格式無效。');
  const a = left.split('.').map(Number), b = right.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

// Only our published, versioned HTTPS assets may reach the operating system.
export function isUpdateDownload(url) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== 'https://github.com' || parsed.username || parsed.password || parsed.search || parsed.hash) return false;
    const match = parsed.pathname.match(/^\/jush-website\/link_app\/releases\/download\/link-app-v([^/]+)\/([^/]+)$/);
    if (!match || !VERSION.test(match[1])) return false;
    const [version, asset] = match.slice(1);
    return asset === 'Download-LinkApp-Windows.cmd' || asset === `Remember-${version}-win.zip` || asset === `LinkApp-${version}-android-debug.apk` || asset === `LinkApp-${version}-android.apk`;
  } catch { return false; }
}

export function selectUpdate(releases, { version, platform }) {
  compareVersions(version, version);
  if (!['windows', 'android'].includes(platform)) throw new Error('不支援這個裝置的更新。');
  if (!Array.isArray(releases)) throw new Error('更新資料格式無效，請稍後重試。');
  const candidates = [];
  for (const release of releases) {
    if (!release || release.draft || typeof release.tag_name !== 'string') continue;
    const available = release.tag_name.replace(/^link-app-v/, '');
    if (release.tag_name !== `link-app-v${available}` || !VERSION.test(available) || compareVersions(available, version) <= 0 || !Array.isArray(release.assets)) continue;
    const names = platform === 'windows' ? ['Download-LinkApp-Windows.cmd', `Remember-${available}-win.zip`] : [`LinkApp-${available}-android.apk`, `LinkApp-${available}-android-debug.apk`];
    const asset = names.map(name => release.assets.find(item => item.name === name && item.state === 'uploaded' && item.size > 0 && isUpdateDownload(item.browser_download_url) && new URL(item.browser_download_url).pathname === `/jush-website/link_app/releases/download/${release.tag_name}/${name}`)).find(Boolean);
    if (!asset) continue;
    candidates.push({ version: available, url: asset.browser_download_url, assetName: asset.name, prerelease: !!release.prerelease });
  }
  return candidates.sort((a, b) => compareVersions(b.version, a.version))[0] ?? null;
}

export function createUpdateChecker({ version, platform, fetcher = globalThis.fetch, clock = Date.now, timeout = 15000 }) {
  let pending = null;
  let lastAttempt = null;
  let failed = false;
  let cached = null;
  return {
    check({ force = false } = {}) {
      if (pending) return pending;
      if (!force && lastAttempt !== null && clock() - lastAttempt < (failed ? RETRY_INTERVAL : UPDATE_INTERVAL)) return Promise.resolve(cached);
      lastAttempt = clock();
      pending = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetcher(RELEASES_URL, { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/vnd.github+json' } });
          if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? '檢查更新暫時受限，請稍後重試。' : '無法取得更新，請確認網路後重試。');
          const candidate = selectUpdate(await response.json(), { version, platform });
          failed = false;
          cached = { candidate, checkedAt: clock(), error: '' };
        } catch (error) {
          failed = true;
          cached = { candidate: cached?.candidate ?? null, checkedAt: cached?.checkedAt ?? null, error: error.name === 'AbortError' ? '檢查更新逾時，請確認網路後重試。' : error.message || '目前無法檢查更新。' };
        } finally { clearTimeout(timer); }
        return cached;
      })().finally(() => { pending = null; });
      return pending;
    },
  };
}
