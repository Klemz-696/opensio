# ==============================================================================
# OpenSIO - Installeur Universel Interactif en Une Commande (Windows PowerShell)
# Usage : irm <raw-url>/install.ps1 | iex
# ==============================================================================
#Requires -Version 5.1
$ErrorActionPreference = "Continue"

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

function Get-SafeCommandOutput {
    param([string]$Command, [string]$Arguments = "")
    try {
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo -Property @{
            FileName               = "cmd.exe"
            Arguments              = ("/c " + $Command + " " + $Arguments).Trim()
            RedirectStandardOutput = $true
            RedirectStandardError  = $true
            UseShellExecute        = $false
            CreateNoWindow         = $true
        }
        $p = [System.Diagnostics.Process]::Start($pinfo)
        $stdout = $p.StandardOutput.ReadToEnd()
        $stderr = $p.StandardError.ReadToEnd()
        $p.WaitForExit(15000)
        return [PSCustomObject]@{ Success = ($p.ExitCode -eq 0); Output = $stdout.Trim(); Error = $stderr.Trim(); ExitCode = $p.ExitCode }
    } catch {
        return [PSCustomObject]@{ Success = $false; Output = ""; Error = $_.Exception.Message; ExitCode = 1 }
    }
}

function Test-DockerDaemon {
    $res = Get-SafeCommandOutput -Command "docker" -Arguments "info --format {{.ServerVersion}}"
    return ($res.Success -and [string]::IsNullOrWhiteSpace($res.Output) -eq $false)
}

function Wait-ForDockerDaemon($timeoutSeconds = 90) {
    Write-Warn "Docker est installe mais le demon/moteur n'est pas joignable."
    Write-Host "   -> Sous Windows : Veuillez lancer Docker Desktop et patienter." -ForegroundColor Cyan
    Write-Host "   -> Sous Linux   : systemctl start docker" -ForegroundColor Cyan
    while ($true) {
        if (-not (Ask-Confirm "Souhaitez-vous attendre que Docker demarre ?" "Y")) {
            Write-Err "Le demon Docker est requis. Arret propre de l'installeur."; exit 1
        }
        Write-Info "Attente du moteur Docker (delai max : ${timeoutSeconds}s)..."
        $elapsed = 0
        while ($elapsed -lt $timeoutSeconds) {
            Start-Sleep -Seconds 3; $elapsed += 3
            Write-Host -NoNewline "." -ForegroundColor Yellow
            if (Test-DockerDaemon) {
                Write-Host ""; Write-Success "Demon Docker operationnel !"; return $true
            }
        }
        Write-Host ""; Write-Warn "Le demon Docker n'a pas repondu (${timeoutSeconds}s)."
    }
}

function Check-Prerequisites {
    Write-Info "Verification des prerequis systeme..."
    # 1. Git
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $gitRes = Get-SafeCommandOutput "git" "--version"
        Write-Success "Git detecte : $($gitRes.Output)"
    } else {
        Write-Warn "Git n'est pas installe."
        if (Ask-Confirm "Installer Git via winget ?" "Y") {
            winget install --id Git.Git -e --source winget
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } else { Write-Err "Git est requis. Arret."; exit 1 }
    }
    # 2. Node.js (>= 22)
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeRes = Get-SafeCommandOutput "node" "-v"
        $nodeVer = [int]($nodeRes.Output.TrimStart('v').Split('.')[0])
        if ($nodeVer -ge 22) { Write-Success "Node.js detecte : $($nodeRes.Output)" }
        else {
            Write-Warn "Node.js $($nodeRes.Output) insuffisant (>= 22 requis)."
            if (Ask-Confirm "Mettre a jour Node.js via winget ?" "Y") { winget install OpenJS.NodeJS.LTS -e }
            else { Write-Err "Node.js >= 22 est requis. Arret."; exit 1 }
        }
    } else {
        Write-Warn "Node.js n'est pas installe."
        if (Ask-Confirm "Installer Node.js via winget ?" "Y") { winget install OpenJS.NodeJS.LTS -e }
        else { Write-Err "Node.js >= 22 est requis. Arret."; exit 1 }
    }
    # 3. pnpm (>= 9)
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        $pnpmRes = Get-SafeCommandOutput "pnpm" "-v"
        if ($pnpmRes.Success -and -not [string]::IsNullOrWhiteSpace($pnpmRes.Output)) {
            $pnpmVerStr = $pnpmRes.Output.TrimStart('v')
            $pnpmMajor = [int]($pnpmVerStr.Split('.')[0])
            if ($pnpmMajor -ge 9) {
                Write-Success "pnpm detecte : v$pnpmVerStr"
            } else {
                Write-Warn "pnpm v$pnpmVerStr est insuffisant (version >= 9.0.0 requise)."
                if (Ask-Confirm "Mettre a jour pnpm vers la version 11.23.0 ?" "Y") {
                    npm install -g pnpm@11.23.0; Write-Success "pnpm mis a jour."
                } else {
                    Write-Err "pnpm >= 9 est requis pour gerer le monorepo. Arret."; exit 1
                }
            }
        } else {
            Write-Success "pnpm detecte."
        }
    } else {
        Write-Warn "pnpm n'est pas installe."
        if (Ask-Confirm "Installer pnpm ?" "Y") {
            npm install -g pnpm@11.23.0; Write-Success "pnpm installe."
        } else { Write-Err "pnpm est requis. Arret."; exit 1 }
    }
    # 4. Docker
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        if (Test-DockerDaemon) { Write-Success "Docker & Demon joignables." }
        else { Wait-ForDockerDaemon 90 }
    } else {
        Write-Err "Docker non installe. Veuillez installer Docker Desktop (https://www.docker.com/products/docker-desktop/)."; exit 1
    }
}

function Detect-Ollama {
    Write-Info "Detection de l'assistant IA local (Ollama)..."
    $script:OllamaAvailable = $false
    $script:LlamaModelPresent = $false
    if (Get-Command ollama -ErrorAction SilentlyContinue) {
        $script:OllamaAvailable = $true
        $modelsRes = Get-SafeCommandOutput "ollama" "list"
        if ($modelsRes.Success -and $modelsRes.Output -match "llama3.1:8b") {
            $script:LlamaModelPresent = $true; Write-Success "Ollama detecte avec 'llama3.1:8b'."
        } else {
            Write-Warn "Ollama installe mais 'llama3.1:8b' absent."
            if (Ask-Confirm "Telecharger 'llama3.1:8b' (~4.9 Go) ?" "Y") {
                Write-Info "Telechargement en cours (ollama pull llama3.1:8b)..."
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

function Get-EnvMap($envFilePath = ".env") {
    $map = @{}
    if (Test-Path $envFilePath) {
        Get-Content $envFilePath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $idx = $line.IndexOf("=")
                $map[$line.Substring(0, $idx).Trim()] = $line.Substring($idx + 1).Trim()
            }
        }
    }
    return $map
}

function Prepare-Repository {
    if ((Test-Path "package.json") -and (Get-Content "package.json" -Raw) -match '"name":\s*"opensio"') {
        Write-Info "Repertoire OpenSIO existant detecte."
        if (Ask-Confirm "Mettre a jour le code source (git pull) ?" "Y") { git pull }
    } else {
        if (Test-Path "opensio") { Set-Location "opensio" }
        else { Write-Info "Clonage du depot OpenSIO..."; git clone "https://github.com/Klemz-696/opensio.git" "opensio"; Set-Location "opensio" }
    }
}

function Setup-Development($withSeed, $withAi) {
    Write-Info "Configuration de l'environnement de developpement..."
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        $jwt = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
        (Get-Content ".env") -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwt" | Set-Content ".env"
        Write-Info "Fichier .env initialise depuis le modele."
    } else {
        Write-Info "Fichier .env existant detecte : les secrets existants sont strictement preserves."
    }
    $aiVal = if ($withAi) { "true" } else { "false" }
    (Get-Content ".env") -replace 'AI_ENABLED=.*', "AI_ENABLED=$aiVal" | Set-Content ".env"
    if (Test-Path "apps/api/.env") {
        (Get-Content "apps/api/.env") -replace 'AI_ENABLED=.*', "AI_ENABLED=$aiVal" | Set-Content "apps/api/.env"
    }

    Write-Info "Demarrage de PostgreSQL 18 via Docker Compose..."
    docker compose -f infra/docker/docker-compose.dev.yml up -d
    Write-Info "Installation des dependances pnpm..."
    pnpm install
    Write-Info "Application des migrations Prisma..."
    pnpm --filter @opensio/api exec prisma migrate deploy
    if ($withSeed) { Write-Info "Amorcage des donnees de demonstration..."; pnpm seed }
    Write-Info "Synchronisation du contenu pedagogique..."
    pnpm content:sync

    Write-Host "`n================================================================" -ForegroundColor Green
    Write-Host "  OpenSIO est pret en Mode Developpement !" -ForegroundColor Green
    Write-Host "================================================================`n" -ForegroundColor Green
    Write-Host "  Frontend Web : http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  API Backend  : http://localhost:4000/api/v1" -ForegroundColor Cyan
    $aiDesc = if ($withAi) { "Active (modele: llama3.1:8b)" } else { "Desactive (AI_ENABLED=false)" }
    Write-Host "  Mentor IA    : $aiDesc`n" -ForegroundColor $(if ($withAi) { "Green" } else { "Yellow" })
    if ($withSeed) {
        Write-Host "  Comptes de test : admin@opensio.local (AdminOpenSIO2026!) / student@opensio.local (StudentOpenSIO2026!)`n"
    }
    Write-Host "  Lancer la plateforme : pnpm dev`n" -ForegroundColor Cyan
}

function Setup-Production($domain, $withSeed, $withAi) {
    Write-Info "Configuration de l'environnement de production..."
    $existingEnv = Get-EnvMap ".env"
    $dbPass = $existingEnv["DB_PASSWORD"]
    $jwtSecret = $existingEnv["JWT_SECRET"]
    $backupKey = $existingEnv["BACKUP_ENCRYPTION_KEY"]
    $alterUserNeeded = $false

    if ($dbPass -and $jwtSecret) {
        Write-Info "Configuration .env existante detectee."
        if (-not (Ask-Confirm "Conserver les secrets et mots de passe existants ?" "Y")) {
            Write-Warn "ATTENTION : La regeneration des secrets modifiera le mot de passe BDD."
            if (Ask-Confirm "Confirmez-vous reellement la regeneration de TOUS les secrets ?" "N") {
                $dbPass = Generate-SecureSecret 16
                $jwtSecret = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
                $backupKey = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
                Write-Host "`nGestion du mot de passe BDD existante :" -ForegroundColor Yellow
                Write-Host "  [1] Appliquer a la base active (ALTER USER via docker exec) [Recommande]" -ForegroundColor Cyan
                Write-Host "  [2] Reinitialiser le volume de donnees (Efface les donnees)" -ForegroundColor Cyan
                Write-Host "  [3] Ne pas toucher au conteneur (alignement manuel)" -ForegroundColor Cyan
                Write-Host -NoNewline "Votre choix [1/2/3] (defaut 1) : "
                $dbChoice = Read-Host
                if ([string]::IsNullOrWhiteSpace($dbChoice)) { $dbChoice = "1" }
                if ($dbChoice -eq "1") { $alterUserNeeded = $true }
                elseif ($dbChoice -eq "2") { docker compose -f docker-compose.prod.yml down -v 2>$null }
            }
        }
    } else {
        $dbPass = Generate-SecureSecret 16
        $jwtSecret = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
        $backupKey = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
    }

    if ([string]::IsNullOrWhiteSpace($backupKey)) { $backupKey = $jwtSecret }
    $aiVal = if ($withAi) { "true" } else { "false" }

    $prodEnv = "NODE_ENV=production`n" +
        "APP_URL=https://$domain`nAPI_PORT=4000`n" +
        "DATABASE_URL=postgresql://opensio:${dbPass}@db:5432/opensio`n" +
        "DB_PASSWORD=$dbPass`nJWT_SECRET=$jwtSecret`n" +
        "BACKUP_ENCRYPTION_KEY=$backupKey`nREGISTRATION_ENABLED=false`n" +
        "CONTENT_PATH=./content`nLAB_RUNNER=simulation`nTERMINAL_ENABLED=true`n" +
        "AI_ENABLED=$aiVal`nAI_BASE_URL=http://host.docker.internal:11434/v1`nAI_MODEL=llama3.1:8b`n"

    Set-Content ".env" $prodEnv
    if ($withAi -and (-not $script:OllamaAvailable) -and (-not $script:LlamaModelPresent)) {
        Write-Info "Demarrage de la stack avec profil conteneur Ollama (--profile ai)..."
        docker compose -f docker-compose.prod.yml --profile ai up -d --build
    } else {
        Write-Info "Demarrage de la stack de production (docker-compose.prod.yml)..."
        docker compose -f docker-compose.prod.yml up -d --build
    }

    if ($alterUserNeeded) {
        Write-Info "Mise a jour du mot de passe PostgreSQL via ALTER USER..."
        Start-Sleep -Seconds 3
        docker compose -f docker-compose.prod.yml exec -T db psql -U opensio -d opensio -c "ALTER USER opensio WITH PASSWORD '$dbPass';" 2>$null
    }

    Write-Host "`n================================================================" -ForegroundColor Green
    Write-Host "  OpenSIO est deploye en Mode Production !" -ForegroundColor Green
    Write-Host "================================================================`n" -ForegroundColor Green
    Write-Host "  Acces HTTPS   : https://$domain" -ForegroundColor Cyan
    Write-Host "  Reverse Proxy : Caddy (TLS Interne) | Sauvegardes : Chiffrees D-18"
    $aiDesc = if ($withAi) { "Active (modele: llama3.1:8b)" } else { "Desactive (AI_ENABLED=false)" }
    Write-Host "  Mentor IA     : $aiDesc`n" -ForegroundColor $(if ($withAi) { "Green" } else { "Yellow" })
    if ($withSeed) {
        Write-Host "  Comptes de test : admin@opensio.local (AdminOpenSIO2026!) / student@opensio.local (StudentOpenSIO2026!)`n"
    }
    Write-Host "  Logs : docker compose -f docker-compose.prod.yml logs -f`n" -ForegroundColor Cyan
}

function Main {
    Write-Banner
    Check-Prerequisites
    Detect-Ollama
    Prepare-Repository

    Write-Host "`nChoisissez le mode d'installation :" -ForegroundColor White
    Write-Host "  [1] Mode Developpement (PC local - BDD Docker + apps Node.js)" -ForegroundColor Cyan
    Write-Host "  [2] Mode Production (Serveur / Homelab - Stack Docker durcie + Caddy HTTPS)" -ForegroundColor Cyan
    Write-Host -NoNewline "Votre choix [1/2] (defaut 1) : "
    $modeChoice = Read-Host
    if ([string]::IsNullOrWhiteSpace($modeChoice)) { $modeChoice = "1" }

    $withSeed = Ask-Confirm "Inclure les donnees et comptes de demonstration (Seed) ?" "Y"
    $withAi = $false
    if ($script:OllamaAvailable -and $script:LlamaModelPresent) {
        $withAi = Ask-Confirm "Activer le Mentor IA local (modele 'llama3.1:8b' detecte) ?" "Y"
    } elseif ($script:OllamaAvailable) {
        $withAi = Ask-Confirm "Ollama est present sans modele 'llama3.1:8b'. Activer le Mentor IA (cle distante / modele autre) ?" "N"
    } else {
        $withAi = Ask-Confirm "Ollama est absent : le Mentor IA sera inactif. Activer tout de meme (cle distante / Ollama ulterieur) ?" "N"
    }

    if ($withAi) { Write-Success "Mentor IA active (AI_ENABLED=true)." }
    else { Write-Info "Mentor IA desactive (AI_ENABLED=false)." }

    if ($modeChoice -eq "2") {
        Write-Host -NoNewline "Nom de domaine ou hostname (defaut: opensio.home.lan) : "
        $domain = Read-Host
        if ([string]::IsNullOrWhiteSpace($domain)) { $domain = "opensio.home.lan" }
        Setup-Production $domain $withSeed $withAi
    } else {
        Setup-Development $withSeed $withAi
    }
}

if ($MyInvocation.InvocationName -ne '.') { Main }
