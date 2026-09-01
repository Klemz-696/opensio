#Requires -Version 5.1
<#
.SYNOPSIS
  Installateur one-shot OpenSIO — La plateforme BTS SIO SISR
.DESCRIPTION
  Ce script installe et lance OpenSIO en une seule commande :
    iex (irm https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.ps1)
  
  Il effectue dans l'ordre :
    1. Vérification des prérequis (Node.js, pnpm, Git, Docker Desktop)
    2. Clonage du dépôt (ou mise à jour si déjà présent)
    3. Installation des dépendances (pnpm install)
    4. Lancement de pnpm opensio (qui gère le reste automatiquement)
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── Couleurs & helpers ──────────────────────────────────────────────────────
function Write-Header {
    Write-Host ""
    Write-Host "  ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗ ██████╗ " -ForegroundColor Cyan
    Write-Host " ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔═══██╗" -ForegroundColor Cyan
    Write-Host " ██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████╗██║██║   ██║" -ForegroundColor Cyan
    Write-Host " ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║╚════██║██║██║   ██║" -ForegroundColor Cyan
    Write-Host " ╚██████╔╝██║     ███████╗██║ ╚████║███████║██║╚██████╔╝" -ForegroundColor Cyan
    Write-Host "  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  La plateforme d'entraînement BTS SIO SISR" -ForegroundColor Gray
    Write-Host "  Installateur automatique v1.0" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host ("─" * 60) -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step   { param($msg) Write-Host "▸ $msg" -ForegroundColor Cyan }
function Write-Ok     { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn   { param($msg) Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Err    { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info   { param($msg) Write-Host "    $msg" -ForegroundColor DarkGray }

function Abort {
    param($msg)
    Write-Host ""
    Write-Err $msg
    Write-Host ""
    Write-Host "  Aide : https://github.com/Klemz-696/opensio#-démarrage-rapide" -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

function Test-Command { param($cmd) return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Get-CommandVersion {
    param($cmd, [string[]]$args)
    try {
        $out = & $cmd @args 2>&1
        return ($out -join ' ').Trim()
    } catch { return $null }
}

# ─── En-tête ─────────────────────────────────────────────────────────────────
Write-Header

# ─── 1. Prérequis : Node.js ──────────────────────────────────────────────────
Write-Step "Vérification des prérequis"

if (-not (Test-Command 'node')) {
    Write-Warn "Node.js non trouvé."
    Write-Info "Téléchargement de Node.js LTS v22..."
    $nodeUrl = 'https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi'
    $nodeMsi = Join-Path $env:TEMP 'node-lts.msi'
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
        Write-Info "Installation de Node.js en cours..."
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn /norestart" -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
        Remove-Item $nodeMsi -Force -ErrorAction SilentlyContinue
    } catch {
        Abort "Impossible d'installer Node.js automatiquement. Installez-le depuis https://nodejs.org (v22 LTS) puis relancez ce script."
    }
}

$nodeVer = Get-CommandVersion 'node' @('--version')
$nodeMajor = [int]($nodeVer -replace 'v(\d+)\..*', '$1')
if ($nodeMajor -lt 22) {
    Abort "Node.js $nodeVer détecté — version 22+ requise. Installez la dernière LTS depuis https://nodejs.org"
}
Write-Ok "Node.js $nodeVer"

# ─── 2. Prérequis : pnpm ────────────────────────────────────────────────────
if (-not (Test-Command 'pnpm')) {
    Write-Warn "pnpm non trouvé — installation via npm..."
    try {
        & npm install -g pnpm 2>&1 | Out-Null
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
    } catch {
        Abort "Impossible d'installer pnpm. Lancez manuellement : npm install -g pnpm"
    }
}
$pnpmVer = Get-CommandVersion 'pnpm' @('--version')
Write-Ok "pnpm $pnpmVer"

# ─── 3. Prérequis : Git ─────────────────────────────────────────────────────
if (-not (Test-Command 'git')) {
    Write-Warn "Git non trouvé."
    Write-Info "Téléchargement de Git pour Windows..."
    $gitUrl = 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe'
    $gitExe = Join-Path $env:TEMP 'git-installer.exe'
    try {
        Invoke-WebRequest -Uri $gitUrl -OutFile $gitExe -UseBasicParsing
        Start-Process $gitExe -ArgumentList '/VERYSILENT /NORESTART /NOCANCEL /SP-' -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
        Remove-Item $gitExe -Force -ErrorAction SilentlyContinue
    } catch {
        Abort "Impossible d'installer Git automatiquement. Installez-le depuis https://git-scm.com puis relancez ce script."
    }
}
$gitVer = Get-CommandVersion 'git' @('--version')
Write-Ok "$gitVer"

# ─── 4. Prérequis : Docker Desktop ─────────────────────────────────────────
$dockerOk = $false
try {
    & docker info 2>&1 | Out-Null
    $dockerOk = ($LASTEXITCODE -eq 0)
} catch {}

if (-not $dockerOk) {
    Write-Warn "Docker Desktop non trouvé ou non démarré."
    Write-Host ""
    Write-Host "  Docker Desktop est requis pour la base de données PostgreSQL." -ForegroundColor Yellow
    Write-Host "  Téléchargement : https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    Write-Host ""
    $choice = Read-Host "  Docker Desktop est-il installé mais pas encore démarré ? [o/N]"
    if ($choice -eq 'o' -or $choice -eq 'O') {
        Write-Info "Démarrage de Docker Desktop..."
        $desktopExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
        if (Test-Path $desktopExe) {
            Start-Process $desktopExe
            Write-Info "Attente de Docker Desktop (jusqu'à 2 minutes)..."
            $waited = 0
            while ($waited -lt 120) {
                Start-Sleep -Seconds 5
                $waited += 5
                try {
                    & docker info 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) { $dockerOk = $true; break }
                } catch {}
                Write-Host "." -NoNewline -ForegroundColor DarkGray
            }
            Write-Host ""
        }
        if (-not $dockerOk) {
            Abort "Docker Desktop ne répond pas. Démarrez-le manuellement, attendez qu'il soit prêt, puis relancez ce script."
        }
        Write-Ok "Docker Desktop opérationnel"
    } else {
        Write-Host ""
        Write-Warn "Docker Desktop est requis. Installez-le depuis https://www.docker.com/products/docker-desktop/"
        Write-Info "Une fois installé et démarré, relancez ce script."
        Write-Host ""
        exit 0
    }
} else {
    $dockerVer = Get-CommandVersion 'docker' @('--version')
    Write-Ok "$dockerVer"
}

Write-Host ""

# ─── 5. Dossier d'installation ──────────────────────────────────────────────
Write-Step "Dossier d'installation"

$defaultDir = Join-Path $env:USERPROFILE 'Desktop\opensio'

Write-Host "  Dossier par défaut : " -NoNewline
Write-Host $defaultDir -ForegroundColor Cyan
$customDir = Read-Host "  Appuyez sur Entrée pour accepter, ou entrez un chemin personnalisé"
if ($customDir.Trim() -ne '') {
    $installDir = $customDir.Trim()
} else {
    $installDir = $defaultDir
}

# ─── 6. Clone ou mise à jour ─────────────────────────────────────────────────
Write-Step "Téléchargement du projet"

$repoUrl = 'https://github.com/Klemz-696/opensio.git'

if (Test-Path (Join-Path $installDir '.git')) {
    Write-Info "Projet déjà présent — mise à jour..."
    Push-Location $installDir
    try {
        & git pull --ff-only 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "git pull impossible — utilisation de la version existante."
        } else {
            Write-Ok "Projet mis à jour"
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Info "Clonage depuis GitHub..."
    Write-Info "Destination : $installDir"

    $parentDir = Split-Path $installDir -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    & git clone $repoUrl $installDir 2>&1
    if ($LASTEXITCODE -ne 0) {
        Abort "Le clonage a échoué. Vérifiez votre connexion internet et votre accès au dépôt."
    }
    Write-Ok "Projet cloné avec succès"
}

Write-Host ""

# ─── 7. Installation des dépendances ────────────────────────────────────────
Write-Step "Installation des dépendances Node.js"
Write-Info "Cela peut prendre 1 à 3 minutes au premier lancement..."
Push-Location $installDir
try {
    & pnpm install
    if ($LASTEXITCODE -ne 0) {
        Abort "pnpm install a échoué. Consultez les erreurs ci-dessus."
    }
    Write-Ok "Dépendances installées"
} finally {
    Pop-Location
}

Write-Host ""

# ─── 8. Résumé et lancement ─────────────────────────────────────────────────
Write-Host ("─" * 60) -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ✅  Installation terminée !" -ForegroundColor Green
Write-Host ""
Write-Host "  OpenSIO est installé dans :" -ForegroundColor Gray
Write-Host "  $installDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Le lanceur va maintenant :" -ForegroundColor Gray
Write-Host "    • Configurer la base de données PostgreSQL (Docker)" -ForegroundColor DarkGray
Write-Host "    • Initialiser le catalogue (seed + synchronisation du contenu)" -ForegroundColor DarkGray
Write-Host "    • Créer un raccourci Bureau OpenSIO.bat" -ForegroundColor DarkGray
Write-Host "    • Démarrer l'API et l'interface web" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  La prochaine fois : double-cliquez sur le raccourci Bureau" -ForegroundColor Yellow
Write-Host "                     ou tapez 'opensio' dans n'importe quel terminal" -ForegroundColor Yellow
Write-Host ""
Write-Host ("─" * 60) -ForegroundColor DarkGray
Write-Host ""

$launch = Read-Host "  Lancer OpenSIO maintenant ? [O/n]"
if ($launch -ne 'n' -and $launch -ne 'N') {
    Push-Location $installDir
    try {
        & pnpm opensio
    } finally {
        Pop-Location
    }
} else {
    Write-Host ""
    Write-Host "  Pour lancer OpenSIO plus tard :" -ForegroundColor Gray
    Write-Host "    cd `"$installDir`"" -ForegroundColor Cyan
    Write-Host "    pnpm opensio" -ForegroundColor Cyan
    Write-Host ""
}
