#Requires -Version 5.1
<#
.SYNOPSIS
  Installateur OpenSIO -- Plateforme BTS SIO SISR (v1.0.2)
.DESCRIPTION
  Installation automatisee : iex (irm https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.ps1)
  Parametres :
    -InstallDir <chemin> : Repertoire cible personnalise (defaut : $env:USERPROFILE\opensio)
    -DryRun              : Diagnostic des prerequis sans aucune modification
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$InstallDir = '',
    [Parameter(Mandatory = $false)]
    [switch]$DryRun,
    [Parameter(Mandatory = $false)]
    [switch]$SkipDirPrompt
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'

# --- Helpers affichage & environnement ---------------------------------------
function Write-Header {
    Write-Host "`n   ___                   ____ ___ ___  " -ForegroundColor Cyan
    Write-Host "  / _ \ _ __   ___ _ __ / ___|_ _/ _ \ " -ForegroundColor Cyan
    Write-Host " | | | | '_ \ / _ \ '_ \\___ \| | | | |" -ForegroundColor Cyan
    Write-Host " | |_| | |_) |  __/ | | |___) | | |_| |" -ForegroundColor Cyan
    Write-Host "  \___/| .__/ \___|_| |_|____/___\___/ " -ForegroundColor Cyan
    Write-Host "       |_|                             `n" -ForegroundColor Cyan
    Write-Host "  OpenSIO -- Plateforme BTS SIO SISR (Installateur v1.0.2)" -ForegroundColor Gray
    if ($DryRun) { Write-Host "  [DRY-RUN : Diagnostic uniquement -- aucune modification]" -ForegroundColor Yellow }
    Write-Host "`n$('-' * 60)`n" -ForegroundColor DarkGray
}

function Write-Step   { param($m) Write-Host "[*] $m" -ForegroundColor Cyan }
function Write-Ok     { param($m) Write-Host "  [+] $m" -ForegroundColor Green }
function Write-Warn   { param($m) Write-Host "  [!] $m" -ForegroundColor Yellow }
function Write-Err    { param($m) Write-Host "  [-] $m" -ForegroundColor Red }
function Write-Info   { param($m) Write-Host "      $m" -ForegroundColor DarkGray }

function Abort {
    param($m)
    Write-Host "`n"; Write-Err $m; Write-Host ""
    Write-Host "  Guide de depannage : https://github.com/Klemz-696/opensio/blob/main/docs/installation.md`n" -ForegroundColor DarkGray
    exit 1
}

function Test-Command { param($cmd) return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Get-CommandVersion {
    param($cmd, [string[]]$cmdArgs)
    try { return ((& $cmd @cmdArgs 2>&1) -join ' ').Trim() } catch { return $null }
}

function Update-SessionPath {
    $m = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $u = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = [System.Environment]::ExpandEnvironmentVariables("$m;$u")
}

function Test-IsSystemDir {
    param([string]$target)
    try {
        $p = [System.IO.Path]::GetFullPath($target).TrimEnd('\', '/')
        if ($p.Length -le 2 -or $p -match '^[a-zA-Z]:$') { return $true }
        $p86 = [System.Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
        $sysList = @($env:SystemRoot, (Join-Path $env:SystemRoot 'System32'), $env:ProgramFiles, $p86, $env:ProgramData)
        foreach ($item in $sysList) {
            if ($item -and ($p -ieq [System.IO.Path]::GetFullPath($item).TrimEnd('\', '/'))) { return $true }
        }
    } catch {}
    return $false
}

# --- Resolution du dossier d'installation ------------------------------------
Write-Header
$defaultDir = Join-Path $env:USERPROFILE 'opensio'
$isInteractive = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    if (-not $SkipDirPrompt -and $isInteractive -and -not $DryRun) {
        Write-Step "Dossier d'installation"
        Write-Host "  Dossier par defaut : " -NoNewline; Write-Host $defaultDir -ForegroundColor Cyan
        $ans = Read-Host "  Ou installer OpenSIO ? [Entree = defaut]"
        $InstallDir = if ($ans -and $ans.Trim() -ne '') { $ans.Trim() } else { $defaultDir }
    } else {
        $InstallDir = $defaultDir
    }
}
$InstallDir = [System.IO.Path]::GetFullPath($InstallDir)
if (Test-IsSystemDir $InstallDir) {
    Abort "Le dossier '$InstallDir' est un dossier systeme protege. Choisissez un autre emplacement."
}

# --- Mode distant (iex irm) : clonage puis relance locale ---------------------
$isRemote = [string]::IsNullOrWhiteSpace($PSScriptRoot)
if ($isRemote -and -not $DryRun) {
    Write-Step "Initialisation distante OpenSIO"
    Write-Info "Destination : $InstallDir"
    if (-not (Test-Command 'git')) {
        Write-Warn "Git absent -- tentative d'installation..."
        if (Test-Command 'winget') {
            & winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements --disable-interactivity
            Update-SessionPath
        }
        if (-not (Test-Command 'git')) { Abort "Git est requis pour cloner OpenSIO. Installez-le depuis https://git-scm.com" }
    }
    $repoUrl = 'https://github.com/Klemz-696/opensio.git'
    if (Test-Path (Join-Path $InstallDir '.git')) {
        Write-Info "Projet existant -- mise a jour via git pull..."
        Push-Location $InstallDir; try { & git pull --ff-only } finally { Pop-Location }
    } else {
        Write-Info "Clonage depuis GitHub..."
        $parent = Split-Path $InstallDir -Parent
        if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        & git clone $repoUrl $InstallDir
        if ($LASTEXITCODE -ne 0) { Abort "Echec du clonage. Verifiez votre connexion internet." }
        Write-Ok "Projet clone avec succes"
    }
    Write-Info "Relance de l'installeur depuis la copie locale..."
    $localScript = Join-Path $InstallDir 'scripts\install.ps1'
    & $localScript -InstallDir $InstallDir -SkipDirPrompt
    exit $LASTEXITCODE
}

# --- 1. Prerequis : Node.js --------------------------------------------------
Write-Step "Verification des prerequis"
Write-Info "Verification de Node.js..."
if (-not (Test-Command 'node')) {
    if ($DryRun) {
        Write-Warn "[DryRun] Node.js absent -- serait installe via winget (OpenJS.NodeJS.LTS)"
    } else {
        Write-Warn "Node.js absent -- installation de Node.js LTS v22..."
        if (Test-Command 'winget') {
            & winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements --disable-interactivity
            Update-SessionPath
        } else {
            $msi = Join-Path $env:TEMP 'node-lts.msi'
            try {
                Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi' -OutFile $msi -UseBasicParsing
                Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait
                Update-SessionPath
                Remove-Item $msi -Force -ErrorAction SilentlyContinue
            } catch { Abort "Impossible d'installer Node.js. Installez Node v22 LTS : https://nodejs.org" }
        }
        if (-not (Test-Command 'node')) { Abort "Node.js reste introuvable. Rouvrez votre terminal puis relancez." }
    }
}
if (Test-Command 'node') {
    $nodeVer = Get-CommandVersion 'node' @('--version')
    $major = 0; if ($nodeVer -match 'v(\d+)\.') { $major = [int]$Matches[1] }
    if ($major -lt 22) {
        if ($DryRun) { Write-Warn "[DryRun] Node.js $nodeVer detecte -- v22+ requise" }
        else { Abort "Node.js $nodeVer detecte -- v22+ requise. Mettez a jour depuis https://nodejs.org" }
    } else { Write-Ok "Node.js $nodeVer" }
}

# --- 2. Prerequis : pnpm -----------------------------------------------------
Write-Info "Verification de pnpm..."
if (-not (Test-Command 'pnpm')) {
    if ($DryRun) {
        Write-Warn "[DryRun] pnpm non trouve -- serait configure via corepack enable ou npm install -g pnpm"
    } else {
        Write-Warn "pnpm absent -- tentative d'activation via Corepack..."
        $pnpmReady = $false
        if (Test-Command 'corepack') {
            try {
                $env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
                & corepack enable
                & corepack prepare pnpm@10 --activate
                Update-SessionPath
                if (Test-Command 'pnpm') { $pnpmReady = $true }
            } catch { Write-Info "Corepack echoue, essai fallback npm..." }
        }
        if (-not $pnpmReady -and (Test-Command 'npm')) {
            Write-Info "Installation de pnpm via npm install -g pnpm..."
            & npm install -g pnpm
            Update-SessionPath
            if (Test-Command 'pnpm') { $pnpmReady = $true }
        }
        if (-not (Test-Command 'pnpm')) {
            Abort "pnpm reste introuvable. Executez : corepack enable && corepack prepare pnpm@10 --activate"
        }
    }
}
if (Test-Command 'pnpm') {
    $pnpmVer = Get-CommandVersion 'pnpm' @('--version')
    Write-Ok "pnpm v$pnpmVer"
}

# --- 3. Prerequis : Git ------------------------------------------------------
Write-Info "Verification de Git..."
if (-not (Test-Command 'git')) {
    if ($DryRun) {
        Write-Warn "[DryRun] Git non trouve -- serait installe via winget (Git.Git)"
    } else {
        Write-Warn "Git absent -- installation en cours..."
        if (Test-Command 'winget') {
            & winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements --disable-interactivity
            Update-SessionPath
        } else {
            $gitExe = Join-Path $env:TEMP 'git-installer.exe'
            try {
                Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -OutFile $gitExe -UseBasicParsing
                Start-Process $gitExe -ArgumentList '/VERYSILENT /NORESTART /NOCANCEL /SP-' -Wait
                Update-SessionPath
                Remove-Item $gitExe -Force -ErrorAction SilentlyContinue
            } catch { Abort "Impossible d'installer Git. Telechargez-le depuis https://git-scm.com" }
        }
        if (-not (Test-Command 'git')) { Abort "Git reste introuvable. Rouvrez votre terminal puis relancez." }
    }
}
if (Test-Command 'git') {
    $gitVer = Get-CommandVersion 'git' @('--version')
    Write-Ok "$gitVer"
}

# --- 4. Prerequis : Docker Desktop ------------------------------------------
Write-Info "Verification de Docker Desktop..."
if (-not (Test-Command 'docker')) {
    if ($DryRun) {
        Write-Warn "[DryRun] Docker non trouve -- Docker Desktop est requis pour la BDD PostgreSQL"
    } else {
        Write-Warn "Docker Desktop n'est pas installe sur cette machine."
        Write-Host "  Docker Desktop est requis : https://www.docker.com/products/docker-desktop/`n" -ForegroundColor Yellow
        Abort "Installez et demarrez Docker Desktop, puis relancez ce script."
    }
} else {
    $daemonOk = $false
    try { & docker info 2>&1 | Out-Null; $daemonOk = ($LASTEXITCODE -eq 0) } catch {}
    if ($daemonOk) {
        $dockVer = Get-CommandVersion 'docker' @('--version')
        Write-Ok "$dockVer (demon actif)"
    } else {
        if ($DryRun) {
            Write-Warn "[DryRun] Docker Desktop installe mais demon non demarre (docker info a echoue)"
        } else {
            Write-Warn "Docker Desktop installe mais le demon ne repond pas."
            $start = $false
            if ($isInteractive) {
                $ans = Read-Host "  Tenter de demarrer Docker Desktop automatiquement ? [O/n]"
                if ($ans -ne 'n' -and $ans -ne 'N') { $start = $true }
            }
            if ($start) {
                $desktopExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
                if (Test-Path $desktopExe) {
                    Start-Process $desktopExe
                    Write-Info "Attente du demon Docker (jusqu'a 90s)..."
                    $w = 0
                    while ($w -lt 90) {
                        Start-Sleep -Seconds 5; $w += 5
                        try { & docker info 2>&1 | Out-Null; if ($LASTEXITCODE -eq 0) { $daemonOk = $true; break } } catch {}
                        Write-Host "." -NoNewline -ForegroundColor DarkGray
                    }
                    Write-Host ""
                }
            }
            if (-not $daemonOk) { Abort "Docker Desktop ne repond pas. Demarrez-le manuellement puis relancez." }
            Write-Ok "Docker Desktop operationnel"
        }
    }
}

# --- Bilan Dry-Run ------------------------------------------------------------
if ($DryRun) {
    Write-Host "`n$('-' * 60)" -ForegroundColor DarkGray
    Write-Host "  [DryRun] Bilan termine avec succes -- aucune modification apportee." -ForegroundColor Green
    Write-Host "  Dossier cible : $InstallDir" -ForegroundColor Gray
    Write-Host "$('-' * 60)`n" -ForegroundColor DarkGray
    exit 0
}

# --- Installation des dependances & Lancement ---------------------------------
Write-Step "Installation des dependances Node.js (pnpm install)"
Push-Location $InstallDir
try {
    & pnpm install
    if ($LASTEXITCODE -ne 0) { Abort "Echec de pnpm install." }
    Write-Ok "Dependances installees"

    # Preparation des variables d'environnement et du client Prisma
    $webEnv = Join-Path $InstallDir 'apps\web\.env'
    $webEnvEx = Join-Path $InstallDir 'apps\web\.env.example'
    if (-not (Test-Path $webEnv) -and (Test-Path $webEnvEx)) {
        Copy-Item $webEnvEx $webEnv
        Write-Ok "apps/web/.env initialise"
    }

    $apiEnv = Join-Path $InstallDir 'apps\api\.env'
    $apiEnvEx = Join-Path $InstallDir 'apps\api\.env.example'
    if (-not (Test-Path $apiEnv) -and (Test-Path $apiEnvEx)) {
        Copy-Item $apiEnvEx $apiEnv
        & node scripts/generate-secrets.mjs --target dev
        Write-Ok "apps/api/.env initialise avec secrets securises"
    }

    & pnpm db:generate
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Client Prisma genere"
    }
} finally { Pop-Location }

Write-Host "`n$('-' * 60)" -ForegroundColor DarkGray
Write-Host "  [+]  Installation terminee avec succes !`n" -ForegroundColor Green
Write-Host "  OpenSIO est installe dans : $InstallDir" -ForegroundColor Cyan
Write-Host "  Pour y retourner : cd `"$InstallDir`" ; pnpm opensio`n" -ForegroundColor Gray
Write-Host "$('-' * 60)`n" -ForegroundColor DarkGray

$launch = 'o'
if ($isInteractive) { $launch = Read-Host "  Lancer OpenSIO maintenant ? [O/n]" }
if ($launch -ne 'n' -and $launch -ne 'N') {
    Push-Location $InstallDir; try { & pnpm opensio } finally { Pop-Location }
} else {
    Write-Host "`n  Pour lancer plus tard : cd `"$InstallDir`" ; pnpm opensio`n" -ForegroundColor Gray
}
