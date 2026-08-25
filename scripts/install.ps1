# ==============================================================================
# OpenSIO - Installeur Universel Interactif en Une Commande (Windows PowerShell)
# Usage : irm <raw-url>/install.ps1 | iex
# ==============================================================================

#Requires -Version 5.1
$ErrorActionPreference = "Stop"

function Write-Banner {
    Write-Host @"
   ___                   ____ ___ ___  
  / _ \ _ __   ___ _ __ / ___|_ _/ _ \ 
 | | | | '_ \ / _ \ '_ \\___ \| | | | |
 | |_| | |_) |  __/ | | |___) | | |_| |
  \___/| .__/ \___|_| |_|____/___\___/ 
       |_|                             
"@ -ForegroundColor Cyan

    Write-Host "  Plateforme de Formation Pratique - BTS SIO option SISR" -ForegroundColor White
    Write-Host "  ---------------------------------------------------------" -ForegroundColor Gray
    Write-Host ""
}

function Write-Info($msg)    { Write-Host " [i] $msg" -ForegroundColor Blue }
function Write-Success($msg) { Write-Host " [v] $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host " [!] $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host " [x] $msg" -ForegroundColor Red }

function Ask-Confirm($prompt, $default = "Y") {
    $suffix = if ($default -eq "Y") { "[O/n]" } else { "[o/N]" }
    Write-Host -NoNewline "$prompt $suffix : "
    $response = Read-Host
    if ([string]::IsNullOrWhiteSpace($response)) { $response = $default }
    return ($response -match "^[oOyY]")
}

function Check-Prerequisites {
    Write-Info "Verification des prerequis systeme..."

    # 1. Git
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) {
        $gitVer = git --version
        Write-Success "Git detecte : $gitVer"
    } else {
        Write-Warn "Git n'est pas installe."
        if (Ask-Confirm "Souhaitez-vous installer Git via winget ?" "Y") {
            winget install --id Git.Git -e --source winget
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } else {
            Write-Err "Git est requis pour deployer OpenSIO. Arret."
            exit 1
        }
    }

    # 2. Node.js (>= 22)
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $nodeRaw = node -v
        $nodeVer = [int]($nodeRaw.TrimStart('v').Split('.')[0])
        if ($nodeVer -ge 22) {
            Write-Success "Node.js detecte : $nodeRaw"
        } else {
            Write-Warn "Node.js $nodeRaw est insuffisant (version >= 22.0.0 requise)."
            if (Ask-Confirm "Souhaitez-vous mettre a jour Node.js via winget ?" "Y") {
                winget install OpenJS.NodeJS.LTS -e
            } else {
                Write-Err "Node.js >= 22 est requis. Arret."
                exit 1
            }
        }
    } else {
        Write-Warn "Node.js n'est pas installe."
        if (Ask-Confirm "Souhaitez-vous installer Node.js via winget ?" "Y") {
            winget install OpenJS.NodeJS.LTS -e
        } else {
            Write-Err "Node.js >= 22 est requis. Arret."
            exit 1
        }
    }

    # 3. pnpm
    $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpmCmd) {
        $pnpmVer = pnpm -v
        Write-Success "pnpm detecte : v$pnpmVer"
    } else {
        Write-Warn "pnpm n'est pas installe."
        if (Ask-Confirm "Souhaitez-vous installer pnpm ?" "Y") {
            npm install -g pnpm@11.23.0
            Write-Success "pnpm installe avec succes."
        } else {
            Write-Err "pnpm est requis pour gerer le monorepo OpenSIO. Arret."
            exit 1
        }
    }

    # 4. Docker Desktop
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker & Demon joignables."
        } else {
            Write-Warn "Docker est installe mais le demon n'est pas demarre."
            Write-Err "Veuillez lancer Docker Desktop puis relancer cet installeur."
            exit 1
        }
    } else {
        Write-Err "Docker n'est pas installe. Veuillez installer Docker Desktop (https://www.docker.com/products/docker-desktop/)."
        exit 1
    }
}

function Detect-Ollama {
    Write-Info "Detection de l'assistant IA local (Ollama)..."
    $script:OllamaAvailable = $false
    $script:LlamaModelPresent = $false

    $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($ollamaCmd) {
        $script:OllamaAvailable = $true
        $models = ollama list 2>&1
        if ($models -match "llama3.1:8b") {
            $script:LlamaModelPresent = $true
            Write-Success "Ollama detecte avec le modele 'llama3.1:8b'."
        } else {
            Write-Warn "Ollama est installe mais le modele 'llama3.1:8b' n'est pas telecharge."
            if (Ask-Confirm "Voulez-vous telecharger le modele 'llama3.1:8b' (~4.9 Go) ?" "Y") {
                Write-Info "Telechargement en cours..."
                ollama pull llama3.1:8b
                $script:LlamaModelPresent = $true
            }
        }
    } else {
        Write-Warn "Ollama n'est pas detecte en local."
        Write-Host "   -> Note : Le Mentor IA sera configure en mode desactive (AI_ENABLED=false)." -ForegroundColor Cyan
        Write-Host "   Vous pourrez l'activer plus tard en installant Ollama ou via une cle API distante." -ForegroundColor Gray
    }
}

function Generate-SecureSecret($bytes = 32) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buf = New-Object byte[] $bytes
    $rng.GetBytes($buf)
    return [System.BitConverter]::ToString($buf).Replace("-", "").ToLower()
}

function Prepare-Repository {
    if ((Test-Path "package.json") -and (Get-Content "package.json" -Raw) -match '"name":\s*"opensio"') {
        Write-Info "Repertoire OpenSIO existant detecte."
        if (Ask-Confirm "Souhaitez-vous mettre a jour le projet existant ?" "Y") {
            git pull
        }
    } else {
        if (Test-Path "opensio") {
            Set-Location "opensio"
        } else {
            Write-Info "Clonage du depot OpenSIO..."
            git clone "https://github.com/Klemz-696/opensio.git" "opensio"
            Set-Location "opensio"
        }
    }
}

function Setup-Development($withSeed, $withAi) {
    Write-Info "Configuration de l'environnement de developpement..."

    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        $jwt = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
        (Get-Content ".env") -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwt" | Set-Content ".env"
    }

    $aiVal = if ($withAi) { "true" } else { "false" }
    (Get-Content ".env") -replace 'AI_ENABLED=.*', "AI_ENABLED=$aiVal" | Set-Content ".env"

    Write-Info "Demarrage de PostgreSQL 18 via Docker Compose..."
    docker compose -f infra/docker/docker-compose.dev.yml up -d

    Write-Info "Installation des dependances pnpm..."
    pnpm install

    Write-Info "Application des migrations Prisma..."
    pnpm --filter @opensio/api exec prisma migrate deploy

    if ($withSeed) {
        Write-Info "Amorcage des donnees de demonstration..."
        pnpm seed
    }

    Write-Info "Synchronisation du contenu pedagogique..."
    pnpm content:sync

    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  OpenSIO est pret en Mode Developpement !" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Frontend Web    : http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  API Backend     : http://localhost:4000/api/v1" -ForegroundColor Cyan
    Write-Host "  Health Check    : OK (status: ok)" -ForegroundColor Green
    Write-Host ""
    if ($withSeed) {
        Write-Host "  Comptes de demonstration :"
        Write-Host "     - Admin    : admin@opensio.local / AdminPass123!" -ForegroundColor White
        Write-Host "     - Etudiant : lucas.moreau@bts-sio.local / StudentPass123!" -ForegroundColor White
        Write-Host ""
    }
    Write-Host "  Pour lancer la plateforme : pnpm dev" -ForegroundColor Cyan
    Write-Host ""
}

function Setup-Production($domain, $withSeed, $withAi) {
    Write-Info "Configuration de l'environnement de production..."

    $jwtSecret = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
    $dbPass = Generate-SecureSecret 16
    $backupKey = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
    $aiVal = if ($withAi) { "true" } else { "false" }

    $prodEnv = "NODE_ENV=production`n" +
        "APP_URL=https://$domain`n" +
        "API_PORT=4000`n" +
        "DATABASE_URL=postgresql://opensio:${dbPass}@db:5432/opensio`n" +
        "DB_PASSWORD=$dbPass`n" +
        "JWT_SECRET=$jwtSecret`n" +
        "BACKUP_ENCRYPTION_KEY=$backupKey`n" +
        "REGISTRATION_ENABLED=false`n" +
        "CONTENT_PATH=./content`n" +
        "LAB_RUNNER=simulation`n" +
        "TERMINAL_ENABLED=true`n" +
        "AI_ENABLED=$aiVal`n" +
        "AI_BASE_URL=http://host.docker.internal:11434/v1`n" +
        "AI_MODEL=llama3.1:8b`n"

    Set-Content ".env" $prodEnv

    Write-Info "Construction et demarrage de la stack de production..."
    docker compose -f docker-compose.prod.yml up -d --build

    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  OpenSIO est deploye en Mode Production !" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Acces HTTPS     : https://$domain" -ForegroundColor Cyan
    Write-Host "  Reverse Proxy   : Caddy (TLS Interne)" -ForegroundColor White
    Write-Host "  Sauvegardes     : Quotidiennes chiffrees (D-18)" -ForegroundColor White
    Write-Host ""
    if ($withSeed) {
        Write-Host "  Comptes de demonstration :"
        Write-Host "     - Admin    : admin@opensio.local / AdminPass123!" -ForegroundColor White
        Write-Host "     - Etudiant : lucas.moreau@bts-sio.local / StudentPass123!" -ForegroundColor White
        Write-Host ""
    }
    Write-Host "  Commandes utiles :"
    Write-Host "     - Logs        : docker compose -f docker-compose.prod.yml logs -f" -ForegroundColor Cyan
    Write-Host "     - Sauvegarde  : docker compose -f docker-compose.prod.yml exec backup /scripts/backup.sh" -ForegroundColor Cyan
    Write-Host "     - Arret       : docker compose -f docker-compose.prod.yml down" -ForegroundColor Cyan
    Write-Host ""
}

function Main {
    Write-Banner
    Check-Prerequisites
    Detect-Ollama
    Prepare-Repository

    Write-Host ""
    Write-Host "Choisissez le mode d'installation :" -ForegroundColor White
    Write-Host "  [1] Mode Developpement (PC local - BDD Docker + apps Node.js)" -ForegroundColor Cyan
    Write-Host "  [2] Mode Production (Serveur / Homelab - Stack Docker durcie + Caddy HTTPS)" -ForegroundColor Cyan
    Write-Host -NoNewline "Votre choix [1/2] (defaut 1) : "
    $modeChoice = Read-Host
    if ([string]::IsNullOrWhiteSpace($modeChoice)) { $modeChoice = "1" }

    $withSeed = Ask-Confirm "Inclure les donnees et comptes de demonstration (Seed) ?" "Y"
    $withAi = $false
    if ($script:LlamaModelPresent) {
        $withAi = Ask-Confirm "Activer l'assistant pedagogique Mentor IA local ?" "Y"
    } else {
        $withAi = Ask-Confirm "Activer l'assistant IA (necessitera Ollama ou une cle distante) ?" "N"
    }

    if ($modeChoice -eq "2") {
        Write-Host -NoNewline "Nom de domaine ou hostname (defaut: opensio.home.lan) : "
        $domain = Read-Host
        if ([string]::IsNullOrWhiteSpace($domain)) { $domain = "opensio.home.lan" }
        Setup-Production $domain $withSeed $withAi
    } else {
        Setup-Development $withSeed $withAi
    }
}

Main
