#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]*$')]
    [string]$TeamFolder = 'ITDSIU23030_TranNamAnh',
    [string]$OutDir = '',
    [switch]$SkipPdf,
    [switch]$SkipBuild,
    [ValidateRange(1024, 65535)][int]$BackendPort = 8091,
    [ValidateRange(1024, 65535)][int]$WebPort = 3001,
    [string]$MavenRepo = (Join-Path $env:USERPROFILE '.m2\repository')
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Some Windows launchers inherit both Path and PATH; Start-Process requires unique keys.
$pathKeys = @([Environment]::GetEnvironmentVariables('Process').Keys | Where-Object { $_ -ieq 'Path' })
if ($pathKeys.Count -gt 1) {
    $processPath = $env:Path
    [Environment]::SetEnvironmentVariable('PATH', $null, 'Process')
    [Environment]::SetEnvironmentVariable('Path', $processPath, 'Process')
}
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backend = Join-Path $root 'backend'
$web = Join-Path $root 'web'
if (-not $OutDir) { $OutDir = Join-Path $root 'dist' }
$OutDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutDir).TrimEnd('\')
$team = [IO.Path]::GetFullPath((Join-Path $OutDir $TeamFolder))
$zip = Join-Path $OutDir "$TeamFolder.zip"
$code = Join-Path $team 'code'

function Assert-NoLinks([string]$Path) {
    $cursor = $Path
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Refusing linked path: $cursor"
            }
        }
        $cursor = Split-Path $cursor -Parent
    }
}

# Intent: rebuild only a named output, with no source deletion or linked paths.
# Status: replacement is guarded by path checks and an ownership marker.
# Next: run the full builder for release. Blockers: see log on failure.
# Confidence: real archive, CLI, and PDF checks run before completion is reported.
Assert-NoLinks $team
foreach ($sourceName in @('backend', 'web', 'db', 'scripts', 'docs', '.git', '.handoff', '.m2-cache')) {
    $sourcePath = Join-Path $root $sourceName
    if ($team.Equals($root, 'OrdinalIgnoreCase') -or
        $root.StartsWith($team + '\', 'OrdinalIgnoreCase') -or
        $team.Equals($sourcePath, 'OrdinalIgnoreCase') -or
        $team.StartsWith($sourcePath + '\', 'OrdinalIgnoreCase')) {
        throw "Output overlaps repository source: $team"
    }
}
if (-not $team.StartsWith($OutDir + '\', 'OrdinalIgnoreCase')) { throw 'Output must be inside OutDir.' }
if ($BackendPort -eq $WebPort -or $BackendPort -in @(3000, 8080) -or $WebPort -in @(3000, 8080)) {
    throw 'Use distinct ports; ports 3000 and 8080 are prohibited.'
}
function Assert-PortFree([int]$Port) {
    # netstat works without the CIM permissions required by Get-NetTCPConnection.
    $connections = @(& netstat.exe -ano -p tcp)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect TCP ports with netstat.' }
    foreach ($line in $connections) {
        $fields = $line.Trim() -split '\s+'
        if ($fields.Count -ge 5 -and $fields[1] -match (':' + $Port + '$') -and $fields[3] -eq 'LISTENING') {
            throw "Port $Port is busy (PID $($fields[4])); no process was stopped."
        }
    }
}
if (-not $SkipPdf) { Assert-PortFree $BackendPort; Assert-PortFree $WebPort }

function Require-File([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Required file missing: $Path" }
}
function Invoke-Native([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}
function Copy-Tree([string]$Source, [string]$Destination) {
    Assert-NoLinks $Source
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    foreach ($item in Get-ChildItem -LiteralPath $Source -Force) {
        if ($item.Name -like '.env*' -or $item.Name -in @('node_modules', '.next', 'out', 'coverage',
            '.git', '.pnpm-store', '.turbo', '.swc', 'test-results', 'playwright-report') -or
            $item.Name -like '*.tsbuildinfo' -or $item.Name -like '*.log') { continue }
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Refusing linked source: $($item.FullName)" }
        $destinationPath = Join-Path $Destination $item.Name
        if ($item.PSIsContainer) { Copy-Tree $item.FullName $destinationPath }
        else { Copy-Item -LiteralPath $item.FullName -Destination $destinationPath }
    }
}
function Wait-Ready([string]$Url, [Diagnostics.Process]$Process, [switch]$Overview) {
    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) { throw "Server PID $($Process.Id) exited before readiness; see logs in $OutDir" }
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                if (-not $Overview -or ($response.Content | ConvertFrom-Json).totalCustomers -gt 0) {
                    Write-Host "Ready: $Url (PID $($Process.Id))"
                    return
                }
            }
        } catch { Write-Verbose $_ }
        Start-Sleep -Seconds 2
    }
    throw "Readiness timed out: $Url; see logs in $OutDir"
}
function Get-ByteSize([string]$Path) {
    $item = Get-Item -LiteralPath $Path
    if (-not $item.PSIsContainer) { return $item.Length }
    return (Get-ChildItem -LiteralPath $Path -File -Recurse -Force | Measure-Object Length -Sum).Sum
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$marker = Join-Path $OutDir "$TeamFolder.submission-owner"
$owner = "$root|$team"
if ((Test-Path -LiteralPath $team) -or (Test-Path -LiteralPath $zip)) {
    if (-not (Test-Path -LiteralPath $marker) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne $owner) {
        throw "Refusing to replace unowned output: $team. Choose a fresh OutDir."
    }
}
$java = (Get-Command java.exe -ErrorAction Stop).Source
$serverProcesses = @()
$savedEnvironment = @{}
$environmentNames = @('SPRING_PROFILES_ACTIVE', 'SERVER_PORT', 'CREDITMINER_CORS_ALLOWED_ORIGINS', 'NEXT_PUBLIC_API_URL')
foreach ($name in $environmentNames) { $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$smokeDirectory = $null
Start-Transcript -Path (Join-Path $OutDir "$TeamFolder.build.log") -Force | Out-Null
try {
    if (-not $SkipBuild) {
        Push-Location $backend
        # A prior Boot repackage can be reused by incremental jar:jar and then shaded
        # into an unusable CLI. The documented jar-plugin flag forces fresh input
        # without requiring the clean plugin in the offline Maven cache.
        try { Invoke-Native 'mvn.cmd' @('-o', "-Dmaven.repo.local=$MavenRepo", '-Dmaven.jar.forceCreation=true', '-q', '-DskipTests', 'package') }
        finally { Pop-Location }
    }
    $cliJar = Join-Path $backend 'target\creditminer-cli.jar'
    $webJar = Join-Path $backend 'target\creditminer-0.1.0-SNAPSHOT.jar'
    Require-File $cliJar
    Require-File $webJar
    Invoke-Native $java @('-jar', $cliJar, '--help')
    if (-not $SkipPdf) {
        Require-File (Join-Path $web 'src\app\report\paper\page.tsx')
        $env:NEXT_PUBLIC_API_URL = "http://localhost:$BackendPort/api"
        if (-not $SkipBuild) {
            Push-Location $web
            try { Invoke-Native 'corepack.cmd' @('pnpm', 'build') }
            finally { Pop-Location }
        }
        Require-File (Join-Path $web '.next\BUILD_ID')
    }
    # Only this direct child and its ZIP are replaceable; reject links before deletion.
    foreach ($path in @($team, $zip)) {
        Assert-NoLinks $path
        if (Test-Path -LiteralPath $path) {
            $links = @(Get-ChildItem -LiteralPath $path -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
            if ($links.Count) { throw "Refusing output containing linked paths: $path" }
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }
    Set-Content -LiteralPath $marker -Value $owner
    foreach ($directory in @('bin', 'source\backend', 'source\web', 'source\db', 'source\scripts', 'datasets', 'models', 'docs')) {
        New-Item -ItemType Directory -Path (Join-Path $code $directory) -Force | Out-Null
    }
    Copy-Item -LiteralPath $cliJar -Destination (Join-Path $code 'bin\creditminer-cli.jar')
    Copy-Item -LiteralPath $webJar -Destination (Join-Path $code 'bin\creditminer-web.jar')
    Copy-Item -LiteralPath (Join-Path $backend 'pom.xml') -Destination (Join-Path $code 'source\backend')
    foreach ($directory in @('src', 'lib')) { Copy-Tree (Join-Path $backend $directory) (Join-Path $code "source\backend\$directory") }
    foreach ($readme in Get-ChildItem -LiteralPath $backend -Filter 'README*' -File) {
        Copy-Item -LiteralPath $readme.FullName -Destination (Join-Path $code 'source\backend')
    }
    Copy-Tree $web (Join-Path $code 'source\web')
    # A SkipPdf archive must not accidentally redistribute an older report.
    $copiedReport = Join-Path $code 'source\web\public\report.pdf'
    if (Test-Path -LiteralPath $copiedReport) { Remove-Item -LiteralPath $copiedReport -Force }
    Copy-Tree (Join-Path $root 'db') (Join-Path $code 'source\db')
    Copy-Tree $PSScriptRoot (Join-Path $code 'source\scripts')
    Copy-Item -LiteralPath (Join-Path $root 'docs\submission-README.md') -Destination (Join-Path $code 'README.md')
    Copy-Item -LiteralPath (Join-Path $root 'docs\LICENSE-THIRD-PARTY.md') -Destination $code
    Copy-Item -LiteralPath (Join-Path $backend 'data\raw\default_credit_card_clients.csv') -Destination (Join-Path $code 'datasets')
    foreach ($name in @('train.arff', 'test.arff', 'enriched.arff', 'clean.arff', 'sequences_default.arff',
        'sequences_nondefault.arff', 'train_seq.arff', 'test_seq.arff', 'phase1_raw.arff', 'clean_assoc.arff')) {
        Copy-Item -LiteralPath (Join-Path $backend "data\processed\$name") -Destination (Join-Path $code 'datasets')
    }
    Get-ChildItem -LiteralPath (Join-Path $backend 'data\processed') -File | Where-Object Extension -in @('.json', '.csv') |
        Copy-Item -Destination (Join-Path $code 'datasets')
    Get-ChildItem -LiteralPath (Join-Path $backend 'models') -File | Where-Object Extension -in @('.model', '.json') |
        Copy-Item -Destination (Join-Path $code 'models')

    if (-not $SkipPdf) {
        Assert-PortFree $BackendPort
        Assert-PortFree $WebPort
        $env:SPRING_PROFILES_ACTIVE = 'demo'
        $env:SERVER_PORT = "$BackendPort"
        $env:CREDITMINER_CORS_ALLOWED_ORIGINS = "http://localhost:$WebPort,http://127.0.0.1:$WebPort"
        $backendProcess = Start-Process -FilePath $java -ArgumentList @('-jar', "`"$webJar`"") -WorkingDirectory $backend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $OutDir "$TeamFolder.backend.log") -RedirectStandardError (Join-Path $OutDir "$TeamFolder.backend.err.log")
        $serverProcesses += $backendProcess
        Write-Host "Started backend PID $($backendProcess.Id) on port $BackendPort"
        Wait-Ready "http://localhost:$BackendPort/api/overview" $backendProcess -Overview
        # Launch the Next entry point directly: this PID owns the server, without a pnpm/cmd wrapper.
        $node = (Get-Command node.exe -ErrorAction Stop).Source
        $next = Join-Path $web 'node_modules\next\dist\bin\next'
        $webProcess = Start-Process -FilePath $node -ArgumentList @("`"$next`"", 'start', '-p', "$WebPort") -WorkingDirectory $web -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $OutDir "$TeamFolder.web.log") -RedirectStandardError (Join-Path $OutDir "$TeamFolder.web.err.log")
        $serverProcesses += $webProcess
        Write-Host "Started web PID $($webProcess.Id) on port $WebPort"
        Wait-Ready "http://localhost:$WebPort" $webProcess
        Invoke-Native $node @((Join-Path $PSScriptRoot 'render-report.mjs'), "http://localhost:$WebPort", $team)
        $pdfCheck = @'
import sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
blank = [i + 1 for i, page in enumerate(reader.pages) if len((page.extract_text() or '').strip()) < 20 and len(page.images) == 0]
print(f'report.pdf: {len(reader.pages)} pages; blank pages: {blank}', flush=True)
if len(reader.pages) < 8 or blank:
    raise SystemExit('PDF verification failed: expected >= 8 pages and no blank pages')
'@
        $pdfCheck | & python - (Join-Path $team 'report.pdf') | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'PDF page verification failed.' }
        Copy-Item -LiteralPath (Join-Path $team 'report.pdf') -Destination (Join-Path $web 'public\report.pdf') -Force
        Copy-Item -LiteralPath (Join-Path $team 'report.pdf') -Destination (Join-Path $code 'source\web\public\report.pdf') -Force
    } else {
        Write-Warning 'PDF generation skipped: this archive is for CLI/source validation and is NOT a complete assignment submission.'
    }
    foreach ($server in $serverProcesses) {
        if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force; $server.WaitForExit(); Write-Host "Stopped PID $($server.Id)" }
    }

    $smokeDirectory = Join-Path ([IO.Path]::GetTempPath()) ('creditminer-smoke-' + [guid]::NewGuid().ToString('N'))
    if ($smokeDirectory.StartsWith($root + '\', 'OrdinalIgnoreCase')) { throw 'Smoke temp directory must be outside repository.' }
    New-Item -ItemType Directory -Path $smokeDirectory | Out-Null
    $predictions = Join-Path $smokeDirectory 'predictions.csv'
    Push-Location $smokeDirectory
    try {
        Write-Host '=== ABSOLUTE PATH CLI TRANSCRIPT ==='
        Write-Host "cwd: $smokeDirectory"
        $arguments = @('-jar', (Join-Path $code 'bin\creditminer-cli.jar'), 'predict', '--model',
            (Join-Path $code 'models\RANDOMFOREST_COST.model'), '--test', (Join-Path $code 'datasets\test.arff'), '--out', $predictions)
        Write-Host ('java ' + (($arguments | ForEach-Object { '"' + $_ + '"' }) -join ' '))
        Invoke-Native $java $arguments
        $rows = @(Import-Csv -LiteralPath $predictions).Count
        if ($rows -ne 5993) { throw "Expected 5993 predictions; got $rows" }
        Write-Host "Exit code: 0; predictions.csv data rows: $rows"
        Copy-Item -LiteralPath $predictions -Destination (Join-Path $code 'docs\predictions.csv')
    } finally { Pop-Location }
    Push-Location $code
    try {
        Write-Host '=== RELATIVE PATH CLI TRANSCRIPT ==='
        Write-Host "cwd: $code"
        Write-Host 'java -jar bin\creditminer-cli.jar evaluate --model models\DECISIONTREE.model --test datasets\test.arff'
        Invoke-Native $java @('-jar', 'bin\creditminer-cli.jar', 'evaluate', '--model', 'models\DECISIONTREE.model', '--test', 'datasets\test.arff')
        Write-Host 'Exit code: 0'
    } finally { Pop-Location }
    Compress-Archive -LiteralPath $team -DestinationPath $zip -CompressionLevel Optimal
    Write-Host '=== SUBMISSION TREE (2 levels; recursive byte sizes) ==='
    Write-Host "$TeamFolder/ ($(Get-ByteSize $team) bytes)"
    foreach ($item in Get-ChildItem -LiteralPath $team | Sort-Object Name) {
        Write-Host "  $($item.Name) ($(Get-ByteSize $item.FullName) bytes)"
        if ($item.PSIsContainer) {
            foreach ($child in Get-ChildItem -LiteralPath $item.FullName | Sort-Object Name) {
                Write-Host "    $($child.Name) ($(Get-ByteSize $child.FullName) bytes)"
            }
        }
    }
    Write-Host "ZIP: $zip ($(Get-ByteSize $zip) bytes)"
    Write-Host "Completed. SkipPdf=$SkipPdf; SkipBuild=$SkipBuild"
} finally {
    foreach ($server in $serverProcesses) {
        if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force; $server.WaitForExit(); Write-Host "Stopped PID $($server.Id)" }
    }
    foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process') }
    if ($smokeDirectory -and (Test-Path -LiteralPath $smokeDirectory)) {
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
        if ([IO.Path]::GetFullPath($smokeDirectory).StartsWith($tempRoot + '\creditminer-smoke-', 'OrdinalIgnoreCase')) {
            Remove-Item -LiteralPath $smokeDirectory -Recurse -Force
        }
    }
    Stop-Transcript | Out-Null
}
