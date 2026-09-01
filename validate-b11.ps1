$ErrorActionPreference = "Continue"

Write-Host "`n=== Etape 1/5 : Moteur Docker ===" -ForegroundColor Cyan
$server = docker version --format "{{.Server.Version}}" 2>$null
if ($LASTEXITCODE -ne 0 -or -not $server) {
    Write-Host "[X] Moteur Docker inaccessible. Lance Docker Desktop et attends la baleine stable." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Moteur Docker operationnel (Server $server)" -ForegroundColor Green

Write-Host "`n=== Etape 2/5 : Secrets .env.production ===" -ForegroundColor Cyan
if (-not (Test-Path .env.production)) {
    node scripts/generate-secrets.mjs
}
Write-Host "[OK] .env.production present" -ForegroundColor Green

Write-Host "`n=== Etape 3/5 : Interpolation Compose ===" -ForegroundColor Cyan
$config = docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml config 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host "[X] compose config a echoue" -ForegroundColor Red; $config; exit 1 }
if ($config -match 'POSTGRES_PASSWORD: ""' -or $config -match 'JWT_SECRET: ""') {
    Write-Host "[X] Variables vides detectees dans le compose (bug d'interpolation)" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Compose valide, secrets injectes partout" -ForegroundColor Green

Write-Host "`n=== Etape 4/5 : Build image API (long) ===" -ForegroundColor Cyan
docker build -f apps/api/Dockerfile -t opensio-api:test .
if ($LASTEXITCODE -ne 0) { Write-Host "[X] Build API echoue" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Image API buildee" -ForegroundColor Green

Write-Host "`n=== Etape 5/5 : Build image Web (long) ===" -ForegroundColor Cyan
docker build -f apps/web/Dockerfile -t opensio-web:test .
if ($LASTEXITCODE -ne 0) { Write-Host "[X] Build Web echoue" -ForegroundColor Red; exit 1 }

Write-Host "`nVALIDATION B11 COMPLETE - pret pour la PR" -ForegroundColor Green