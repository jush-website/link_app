const { spawnSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const result = spawnSync(process.execPath, [require.resolve('firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--only', 'auth,firestore', '--project', 'demo-remember', '--config', 'firebase.emulators.json', 'npx playwright test --config playwright.sync.config.js'], {
  stdio: 'inherit',
  env: { ...process.env, FIREBASE_EMULATORS_PATH: path.join(os.tmpdir(), 'remember-firebase-emulators'), XDG_CONFIG_HOME: path.join(os.tmpdir(), 'remember-firebase-config') },
});
if (result.error) { console.error(result.error.message); process.exitCode = 1; }
else process.exitCode = result.status ?? 1;
