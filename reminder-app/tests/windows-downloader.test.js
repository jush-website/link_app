import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import generator from '../scripts/create-windows-downloader.cjs';

const pwsh = process.env.POWERSHELL_EXECUTABLE || (process.platform === 'win32' ? 'powershell.exe' : 'pwsh');
const available = spawnSync(pwsh, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']).status === 0;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const buffers = [Buffer.from('cached-first-part'), Buffer.from('compatible-second-part'), Buffer.from('third-part-to-retry')];
const expected = Buffer.concat(buffers);
const manifest = { tag: 'link-app-v0.4.0', name: 'Remember-0.4.0-win.zip', sha256: hash(expected), size: expected.length, parts: buffers.map((bytes, index) => ({ name: `Remember-0.4.0-win.zip.part00${index + 1}`, size: bytes.length, sha256: hash(bytes) })) };

function run(body, options = {}) {
  const temp = mkdtempSync(join(tmpdir(), 'linkapp-downloader-'));
  const folder = join(temp, "download folder ' & spaces");
  mkdirSync(folder);
  const cmd = join(folder, 'Download-LinkApp-Windows.cmd');
  writeFileSync(cmd, generator.renderDownloader(options.manifest || manifest));
  const setup = `
$script:requests = 0
$script:mode = '${options.mode || 'recover'}'
function Start-Sleep { param($Seconds) }
function Invoke-WebRequest {
    param($Uri, $OutFile, [switch]$UseBasicParsing, $TimeoutSec, $Headers)
    $script:requests++
    if ($Uri -notlike '*part003') { throw 'Verified cached parts were downloaded again.' }
    if ($script:mode -eq 'corrupt' -or ($script:mode -eq 'recover' -and $script:requests -eq 1)) { [IO.File]::WriteAllText($OutFile, 'bad'); return }
    if ($script:mode -eq 'recover' -and $script:requests -eq 2) { throw 'Simulated network interruption' }
    [IO.File]::WriteAllBytes($OutFile, [Convert]::FromBase64String('${buffers[2].toString('base64')}'))
}
$cache = Join-Path $env:LINKAPP_DOWNLOAD_DIR '.remember-download-0.4.0'
$oldCache = Join-Path $env:LINKAPP_DOWNLOAD_DIR '.remember-download-0.3.0'
New-Item -ItemType Directory -Path $cache, $oldCache -Force | Out-Null
[IO.File]::WriteAllBytes((Join-Path $cache '${manifest.parts[0].name}'), [Convert]::FromBase64String('${buffers[0].toString('base64')}'))
[IO.File]::WriteAllBytes((Join-Path $oldCache 'Remember-0.3.0-win.zip.part002'), [Convert]::FromBase64String('${buffers[1].toString('base64')}'))
[IO.File]::WriteAllText((Join-Path $cache '${manifest.parts[2].name}.downloading'), 'old broken download')
$source = [IO.File]::ReadAllText($env:LINKAPP_DOWNLOAD_SCRIPT)
$code = $source -split '(?m)^# BEGIN LINKAPP POWERSHELL\\r?$', 2
$download = [scriptblock]::Create($code[1])
${body}
`;
  const script = join(temp, 'exercise.ps1');
  writeFileSync(script, setup);
  try {
    const result = spawnSync(pwsh, ['-NoProfile', '-NonInteractive', '-Command', '& ([scriptblock]::Create([IO.File]::ReadAllText($env:LINKAPP_TEST_SCRIPT)))'], { encoding: 'utf8', timeout: 15000, env: { ...process.env, LINKAPP_DOWNLOAD_DIR: folder, LINKAPP_DOWNLOAD_SCRIPT: cmd, LINKAPP_TEST_SCRIPT: script } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    if (options.complete) assert.deepEqual(readFileSync(join(folder, manifest.name)), expected);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

test('Windows downloader retries corrupt bytes and interrupted requests; reuses verified current and compatible older parts', { skip: !available && 'PowerShell is needed for executable downloader tests' }, () => {
  run(`& $download
if ($script:requests -ne 3) { throw 'Expected exactly three attempts for the failed part.' }
if (Get-ChildItem -LiteralPath $cache -Filter '*.downloading') { throw 'Failed temporary files were kept.' }`, { complete: true });
});

test('Windows downloader refuses persistent corruption, cleans temporary data and resumes without redownloading verified parts', { skip: !available && 'PowerShell is needed for executable downloader tests' }, () => {
  run(`$failed = $false
try { & $download } catch { $failed = $true; if ($_.Exception.Message -notlike '*stopped after 3 attempts*') { throw } }
if (-not $failed -or $script:requests -ne 3) { throw 'Corruption did not stop after three attempts.' }
if (Test-Path -LiteralPath (Join-Path $env:LINKAPP_DOWNLOAD_DIR '${manifest.name}')) { throw 'A corrupt ZIP was exposed.' }
if (Get-ChildItem -LiteralPath $cache -Filter '*.downloading') { throw 'Failed temporary data remained.' }
$script:mode = 'valid'
& $download
if ($script:requests -ne 4) { throw 'Verified cached parts were not retained across retry.' }`, { mode: 'corrupt', complete: true });
});

test('Windows downloader verifies the assembled archive and removes an invalid assembled ZIP', { skip: !available && 'PowerShell is needed for executable downloader tests' }, () => {
  run(`$failed = $false
try { & $download } catch { $failed = $true; if ($_.Exception.Message -notlike '*assembled ZIP failed checksum*') { throw } }
if (-not $failed) { throw 'The incorrect whole-file checksum was ignored.' }
if (Get-ChildItem -LiteralPath $env:LINKAPP_DOWNLOAD_DIR -Filter '*.zip*' -File) { throw 'An invalid ZIP was left behind.' }
if ((Get-ChildItem -LiteralPath $cache -Filter '*.part*').Count -ne 3) { throw 'Verified parts were deleted.' }`, { mode: 'valid', manifest: { ...manifest, sha256: '0'.repeat(64) } });
});
