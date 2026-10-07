$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$manifest = @@MANIFEST@@
$dest = $env:LINKAPP_DOWNLOAD_DIR
if (-not $dest) { throw 'The download folder is missing. Start Download-LinkApp-Windows.cmd again.' }
$zip = Join-Path $dest $manifest.ZipName
$base = 'https://github.com/jush-website/link_app/releases/download/link-app-v' + $manifest.Version + '/'

function Test-VerifiedFile($Path, $Hash, $Size) {
    return (Test-Path -LiteralPath $Path -PathType Leaf) -and
        ((Get-Item -LiteralPath $Path).Length -eq $Size) -and
        ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -eq $Hash)
}

if (Test-Path -LiteralPath $zip) {
    if (Test-VerifiedFile $zip $manifest.Hash $manifest.Size) {
        Write-Host 'The verified ZIP is already downloaded.'
        return
    }
    throw ('A different ' + $manifest.ZipName + ' already exists. Rename that file and try again.')
}
$cache = Join-Path $dest ('.remember-download-' + $manifest.Version)
New-Item -ItemType Directory -Path $cache -Force | Out-Null
$index = 0
foreach ($part in $manifest.Parts) {
    $index++
    $path = Join-Path $cache $part.Name
    if (Test-VerifiedFile $path $part.Hash $part.Size) { continue }
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path }
    # Reuse only matching bytes, including compatible parts from an earlier version.
    $suffix = $part.Name.Substring($part.Name.LastIndexOf('.part'))
    foreach ($otherCache in (Get-ChildItem -LiteralPath $dest -Directory -Force -Filter '.remember-download-*')) {
        if ($otherCache.FullName -eq $cache) { continue }
        foreach ($candidate in (Get-ChildItem -LiteralPath $otherCache.FullName -File -Force -Filter ('Remember-*-win.zip' + $suffix))) {
            if (Test-VerifiedFile $candidate.FullName $part.Hash $part.Size) {
                Copy-Item -LiteralPath $candidate.FullName -Destination $path
                break
            }
        }
        if (Test-VerifiedFile $path $part.Hash $part.Size) { break }
    }
    if (Test-VerifiedFile $path $part.Hash $part.Size) {
        Write-Host ('Reused verified part ' + $index + ' of ' + $manifest.Parts.Count)
        continue
    }
    $download = $path + '.downloading'
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            if (Test-Path -LiteralPath $download) { Remove-Item -LiteralPath $download }
            Write-Host ('Downloading part ' + $index + ' of ' + $manifest.Parts.Count + ' (attempt ' + $attempt + '/3)')
            Invoke-WebRequest -UseBasicParsing -Uri ($base + $part.Name) -OutFile $download -TimeoutSec 90 -Headers @{ 'Cache-Control' = 'no-cache'; 'Accept-Encoding' = 'identity' }
            if (-not (Test-VerifiedFile $download $part.Hash $part.Size)) {
                $received = if (Test-Path -LiteralPath $download) { (Get-Item -LiteralPath $download).Length } else { 0 }
                throw ('Checksum failed: ' + $part.Name + '. Received ' + $received + ' bytes; expected ' + $part.Size + '.')
            }
            Move-Item -LiteralPath $download -Destination $path
            break
        } catch {
            $reason = $_.Exception.Message
            if (Test-Path -LiteralPath $download) { Remove-Item -LiteralPath $download }
            if ($attempt -eq 3) {
                throw ($reason + ' Download stopped after 3 attempts. Verified parts are saved; run this file again to resume. If this repeats, try another network.')
            }
            Write-Host ($reason + ' Retrying this part...')
            Start-Sleep -Seconds $attempt
        }
    }
}
$temp = $zip + '.assembling'
try {
    $output = [IO.File]::Open($temp, [IO.FileMode]::Create, [IO.FileAccess]::Write)
    try {
        foreach ($part in $manifest.Parts) {
            $inputFile = [IO.File]::OpenRead((Join-Path $cache $part.Name))
            try { $inputFile.CopyTo($output) } finally { $inputFile.Dispose() }
        }
    } finally { $output.Dispose() }
    if (-not (Test-VerifiedFile $temp $manifest.Hash $manifest.Size)) {
        throw 'The assembled ZIP failed checksum verification. Verified parts are saved; no ZIP was installed.'
    }
    Move-Item -LiteralPath $temp -Destination $zip
} finally {
    if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp }
}
Write-Host ('Download complete. Extract the entire ' + $manifest.ZipName + ' and start Remember.exe.')
