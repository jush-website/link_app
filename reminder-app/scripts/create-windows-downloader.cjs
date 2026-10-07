const fs = require('node:fs');
const path = require('node:path');

function renderPowerShell(manifest) {
  if (!/^\d+\.\d+\.\d+$/.test(manifest.tag?.replace(/^link-app-v/, '')) || manifest.tag !== `link-app-v${manifest.tag.replace(/^link-app-v/, '')}`) throw new Error('Invalid release tag');
  const version = manifest.tag.slice('link-app-v'.length);
  if (manifest.name !== `Remember-${version}-win.zip` || !/^[a-f0-9]{64}$/.test(manifest.sha256) || !Number.isSafeInteger(manifest.size) || manifest.size <= 0) throw new Error('Invalid archive metadata');
  if (!Array.isArray(manifest.parts) || !manifest.parts.length || manifest.parts.length > 999) throw new Error('Invalid archive parts');
  const parts = manifest.parts.map((part, index) => {
    if (part.name !== `${manifest.name}.part${String(index + 1).padStart(3, '0')}` || !/^[a-f0-9]{64}$/.test(part.sha256) || !Number.isSafeInteger(part.size) || part.size <= 0) throw new Error('Invalid part metadata');
    return `    @{ Name='${part.name}'; Hash='${part.sha256}'; Size=${part.size} }`;
  });
  if (manifest.parts.reduce((total, part) => total + part.size, 0) !== manifest.size) throw new Error('Part sizes do not match the archive');
  const values = `@{ Version='${version}'; ZipName='${manifest.name}'; Hash='${manifest.sha256}'; Size=${manifest.size}; Parts=@(\n${parts.join('\n')}\n) }`;
  return fs.readFileSync(path.join(__dirname, 'windows-downloader.ps1'), 'utf8').replace('@@MANIFEST@@', values);
}

function renderDownloader(manifest) {
  const bootstrap = `@echo off
setlocal
set "LINKAPP_DOWNLOAD_DIR=%~dp0"
set "LINKAPP_DOWNLOAD_SCRIPT=%~f0"
powershell.exe -NoProfile -Command "& { $ErrorActionPreference='Stop'; $source=[IO.File]::ReadAllText($env:LINKAPP_DOWNLOAD_SCRIPT); $code=$source -split '(?m)^# BEGIN LINKAPP POWERSHELL\\r?$',2; if($code.Count -ne 2){ throw 'The download script is incomplete. Download it again.' }; & ([scriptblock]::Create($code[1])) }"
set "LINKAPP_DOWNLOAD_RESULT=%ERRORLEVEL%"
if not "%LINKAPP_DOWNLOAD_RESULT%"=="0" echo Download failed. Verified parts are saved; run this file again to retry.
pause
exit /b %LINKAPP_DOWNLOAD_RESULT%
# BEGIN LINKAPP POWERSHELL
`;
  return Buffer.from((bootstrap + renderPowerShell(manifest)).replace(/\r?\n/g, '\r\n'), 'ascii');
}

module.exports = { renderDownloader, renderPowerShell };
if (require.main === module) {
  if (process.argv.length !== 4) throw new Error('Usage: node create-windows-downloader.cjs manifest.json Download-LinkApp-Windows.cmd');
  fs.writeFileSync(process.argv[3], renderDownloader(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))));
}
