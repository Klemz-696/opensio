# ==============================================================================
# OpenSIO - Installeur Universel Interactif (Windows PowerShell Dev-First)
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
    Write-Host "  Environnement de Developpement Windows (Dev-First)" -ForegroundColor Gray
    Write-Host "  ---------------------------------------------------------`n" -ForegroundColor Gray
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

function Ask-Input($prompt, $default) {
    Write-Host -NoNewline "$prompt [$default] : "
    $response = Read-Host
    if ([string]::IsNullOrWhiteSpace($response)) { return $default }
    return $response
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
    Write-Warn "Docker est installe mais le demon n'est pas joignable."
    Write-Host "   -> Sous Windows : Lancez Docker Desktop et patientez.`n" -ForegroundColor Cyan
    while ($true) {
        if (-not (Ask-Confirm "Souhaitez-vous attendre que Docker demarre ?" "Y")) {
            Write-Err "Le demon Docker est requis. Arret de l'installeur."; exit 1
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
    Write-Info "Verification des prerequis systeme (Outils & Versions)..."
    # 1. Git (>= 2.30)
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
    # 2. Node.js (>= 20)
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeRes = Get-SafeCommandOutput "node" "-v"
        $nodeVer = [int]($nodeRes.Output.TrimStart('v').Split('.')[0])
        if ($nodeVer -ge 20) { Write-Success "Node.js detecte : $($nodeRes.Output)" }
        else {
            Write-Warn "Node.js $($nodeRes.Output) insuffisant (>= 20 requis)."
            if (Ask-Confirm "Mettre a jour Node.js via winget ?" "Y") { winget install OpenJS.NodeJS.LTS -e }
            else { Write-Err "Node.js >= 20 est requis. Arret."; exit 1 }
        }
    } else {
        Write-Warn "Node.js n'est pas installe."
        if (Ask-Confirm "Installer Node.js via winget ?" "Y") { winget install OpenJS.NodeJS.LTS -e }
        else { Write-Err "Node.js >= 20 est requis. Arret."; exit 1 }
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
                if (Ask-Confirm "Mettre a jour pnpm vers 11.23.0 ?" "Y") {
                    npm install -g pnpm@11.23.0; Write-Success "pnpm mis a jour."
                } else { Write-Err "pnpm >= 9 est requis. Arret."; exit 1 }
            }
        } else { Write-Success "pnpm detecte." }
    } else {
        Write-Warn "pnpm n'est pas installe."
        if (Ask-Confirm "Installer pnpm ?" "Y") {
            npm install -g pnpm@11.23.0; Write-Success "pnpm installe."
        } else { Write-Err "pnpm est requis. Arret."; exit 1 }
    }
    # 4. Docker (>= 24.0)
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        if (Test-DockerDaemon) { Write-Success "Docker & Demon joignables." }
        else { Wait-ForDockerDaemon 90 }
    } else {
        Write-Err "Docker non installe. Veuillez installer Docker Desktop (https://www.docker.com/products/docker-desktop/)."; exit 1
    }
}

function Detect-Ollama-Options {
    Write-Info "Configuration de l'assistant IA (Ollama)..."
    $script:AiEnabled = "false"
    $script:AiUrl = "http://127.0.0.1:11434/v1"
    $script:AiModel = "llama3.1:8b"

    $hasLocalOllama = $false
    if (Get-Command ollama -ErrorAction SilentlyContinue) { $hasLocalOllama = $true }

    Write-Host "`nChoisissez l'emplacement de l'assistant IA :" -ForegroundColor White
    Write-Host "  [1] Ollama local sur l'hote $(if ($hasLocalOllama) { '(Detecte)' } else { '(Non detecte)' })" -ForegroundColor Cyan
    Write-Host "  [2] Machine / Serveur distant dedie" -ForegroundColor Cyan
    Write-Host "  [3] Sans IA (Desactive - degradation gracieuse)" -ForegroundColor Cyan

    $aiChoice = Ask-Input "Votre choix [1/2/3]" $(if ($hasLocalOllama) { "1" } else { "3" })
    switch ($aiChoice) {
        "1" {
            $script:AiEnabled = "true"
            $script:AiUrl = "http://127.0.0.1:11434/v1"
            if ($hasLocalOllama) {
                $modelsRes = Get-SafeCommandOutput "ollama" "list"
                if ($modelsRes.Success -and $modelsRes.Output -match "llama3.1:8b") {
                    Write-Success "Modele 'llama3.1:8b' pret en local."
                } else {
                    Write-Warn "Modele 'llama3.1:8b' absent."
                    if (Ask-Confirm "Telecharger 'llama3.1:8b' (~4.9 Go) ?" "Y") {
                        Write-Info "Telechargement en cours (ollama pull llama3.1:8b)..."
                        ollama pull llama3.1:8b
                    }
                }
            }
        }
        "2" {
            $script:AiEnabled = "true"
            $script:AiUrl = Ask-Input "URL de l'API Ollama distante" "http://192.168.1.50:11434/v1"
            Write-Success "IA distante configuree : $script:AiUrl"
        }
        default {
            $script:AiEnabled = "false"
            Write-Info "Assistant IA desactive (AI_ENABLED=false)."
        }
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
        if (Ask-Confirm "Mettre a jour le code source (git pull) ?" "Y") { git pull }
    } else {
        if (Test-Path "opensio") { Set-Location "opensio" }
        else { Write-Info "Clonage du depot OpenSIO..."; git clone "https://github.com/Klemz-696/opensio.git" "opensio"; Set-Location "opensio" }
    }
}

function Setup-Development($seedChoice) {
    Write-Info "Configuration de l'environnement de developpement..."
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        $jwt = (Generate-SecureSecret 32) + (Generate-SecureSecret 32)
        (Get-Content ".env") -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwt" | Set-Content ".env"
        Write-Info "Fichier .env initialise depuis le modele."
    } else {
        Write-Info "Fichier .env existant detecte : les secrets existants sont preserves."
    }

    (Get-Content ".env") -replace 'AI_ENABLED=.*', "AI_ENABLED=$script:AiEnabled" |
        ForEach-Object { $_ -replace 'AI_BASE_URL=.*', "AI_BASE_URL=$script:AiUrl" } |
        Set-Content ".env"

    if (Test-Path "apps/api/.env") {
        Copy-Item ".env" "apps/api/.env" -Force
    }

    Write-Info "Demarrage de PostgreSQL 18 via Docker Compose..."
    docker compose -f infra/docker/docker-compose.dev.yml up -d
    Write-Info "Installation des dependances pnpm..."
    pnpm install
    Write-Info "Application des migrations Prisma..."
    pnpm --filter @opensio/api exec prisma migrate deploy

    if ($seedChoice -ne "aucun") {
        Write-Info "Amorcage des donnees (Seed: $seedChoice)..."
        $env:SEED_MODE = $seedChoice
        pnpm seed
    }

    Write-Info "Synchronisation du contenu pedagogique..."
    pnpm content:sync

    Write-Host "`n================================================================" -ForegroundColor Green
    Write-Host "  [v] OpenSIO est pret en Mode Developpement (Windows) !" -ForegroundColor Green
    Write-Host "================================================================`n" -ForegroundColor Green
    Write-Host "  Frontend Web : http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  API Backend  : http://localhost:4000/api/v1" -ForegroundColor Cyan
    $aiDesc = if ($script:AiEnabled -eq "true") { "Active ($script:AiUrl)" } else { "Desactive" }
    Write-Host "  Mentor IA    : $aiDesc`n" -ForegroundColor $(if ($script:AiEnabled -eq "true") { "Green" } else { "Yellow" })
    if ($seedChoice -eq "complet") {
        Write-Host "  Comptes de test :" -ForegroundColor White
        Write-Host "   - Admin   : admin@opensio.local (AdminOpenSIO2026!)" -ForegroundColor Cyan
        Write-Host "   - Etudiant: student@opensio.local (StudentOpenSIO2026!)`n" -ForegroundColor Cyan
    }
    Write-Host "  Lancer la plateforme : pnpm dev`n" -ForegroundColor Cyan
}

function Main {
    Write-Banner
    Check-Prerequisites
    Detect-Ollama-Options
    Prepare-Repository

    Write-Host "`nJeu de donnees initial (Seed) :" -ForegroundColor White
    Write-Host "  [1] Complet (Admin + Etudiant Demo) [Defaut]" -ForegroundColor Cyan
    Write-Host "  [2] Minimal (Admin seul)" -ForegroundColor Cyan
    Write-Host "  [3] Aucun" -ForegroundColor Cyan
    $seedInput = Ask-Input "Votre choix [1/2/3]" "1"
    $seedChoice = "complet"
    if ($seedInput -eq "2") { $seedChoice = "minimal" }
    elseif ($seedInput -eq "3") { $seedChoice = "aucun" }

    Setup-Development $seedChoice
}

if ($MyInvocation.InvocationName -ne '.') { Main }
