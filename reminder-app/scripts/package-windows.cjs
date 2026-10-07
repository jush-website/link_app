const { spawnSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const electronCache = process.env.ELECTRON_CACHE || path.join(os.tmpdir(), 'remember-electron-cache');
const result = spawnSync(process.execPath, [require.resolve('electron-builder/out/cli/cli.js'), '--win', 'zip', '--publish', 'never', '--config.electronDownload.cache', electronCache], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_CACHE: electronCache,
    ELECTRON_BUILDER_CACHE: process.env.ELECTRON_BUILDER_CACHE || path.join(os.tmpdir(), 'remember-electron-builder-cache'),
  },
});
if (result.error) { console.error(result.error.message); process.exitCode = 1; }
else process.exitCode = result.status ?? 1;
