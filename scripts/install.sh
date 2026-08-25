#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Installeur Universel Interactif en Une Commande (Linux / macOS)
# Usage : curl -fsSL <raw-url>/install.sh | bash
# ==============================================================================
set -euo pipefail

if [ ! -t 0 ] && [ -e /dev/tty ]; then
  exec < /dev/tty
fi

C_RESET='\033[0m'
C_BOLD='\033[1m'
C_CYAN='\033[36m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_BLUE='\033[34m'

REPO_URL="https://github.com/Klemz-696/opensio.git"
TARGET_DIR="opensio"

print_banner() {
  echo -e "${C_CYAN}${C_BOLD}"
  echo "  ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗ ██████╗ "
  echo " ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔═══██╗"
  echo " ██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████╗██║██║   ██║"
  echo " ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║╚════██║██║██║   ██║"
  echo " ╚██████╔╝██║     ███████╗██║ ╚████║███████║██║╚██████╔╝"
  echo "  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝ "
  echo -e "${C_RESET}"
  echo -e "${C_BOLD}  Plateforme de Formation Pratique — BTS SIO option SISR${C_RESET}"
  echo -e "  ---------------------------------------------------------\n"
}

log_info() { echo -e "${C_BLUE}ℹ${C_RESET}  $1"; }
log_success() { echo -e "${C_GREEN}✔${C_RESET}  $1"; }
log_warn() { echo -e "${C_YELLOW}⚠${C_RESET}  $1"; }
log_error() { echo -e "${C_RED}✖  $1${C_RESET}"; }

ask_confirm() {
  local prompt="$1" default="${2:-Y}" response
  if [ "$default" = "Y" ]; then echo -ne "${C_BOLD}${prompt} [O/n] : ${C_RESET}"
  else echo -ne "${C_BOLD}${prompt} [o/N] : ${C_RESET}"; fi
  read -r response || response="$default"
  response="${response:-$default}"
  [[ "$response" =~ ^[oOyY] ]]
}

test_docker_daemon() {
  docker info --format '{{.ServerVersion}}' >/dev/null 2>&1
}

wait_for_docker_daemon() {
  local timeout="${1:-90}"
  log_warn "Docker est installé mais le démon n'est pas joignable."
  echo -e "   ${C_CYAN}➜ Sous Windows / macOS :${C_RESET} Lancez Docker Desktop et patientez."
  echo -e "   ${C_CYAN}➜ Sous Linux :${C_RESET} Exécutez 'sudo systemctl start docker'\n"

  if command -v systemctl &>/dev/null; then
    log_info "Tentative de démarrage du service Docker via systemctl..."
    sudo systemctl start docker 2>/dev/null || true
  fi

  while true; do
    if ! ask_confirm "Souhaitez-vous attendre que le démon Docker soit prêt ?" "Y"; then
      log_error "Le démon Docker est requis pour continuer. Arrêt de l'installeur."
      exit 1
    fi

    log_info "Attente du démon Docker (délai max : ${timeout}s)..."
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
      sleep 3; elapsed=$((elapsed + 3))
      echo -ne "${C_YELLOW}.${C_RESET}"
      if test_docker_daemon; then
        echo ""; log_success "Démon Docker connecté avec succès !"; return 0
      fi
    done
    echo ""; log_warn "Le démon Docker n'a pas répondu dans le délai (${timeout}s)."
  done
}

check_prerequisites() {
  log_info "Vérification des prérequis système..."
  # 1. Git
  if command -v git &>/dev/null; then
    log_success "Git détecté : $(git --version 2>/dev/null || echo 'OK')"
  else
    log_warn "Git n'est pas installé."
    if ask_confirm "Installer Git maintenant ?" "Y"; then
      if command -v apt-get &>/dev/null; then sudo apt-get update && sudo apt-get install -y git
      elif command -v dnf &>/dev/null; then sudo dnf install -y git
      elif command -v brew &>/dev/null; then brew install git
      else log_error "Gestionnaire de paquets inconnu. Installez Git manuellement."; exit 1; fi
    else log_error "Git est obligatoire. Arrêt."; exit 1; fi
  fi
  # 2. Node.js (>= 22)
  if command -v node &>/dev/null; then
    NODE_RAW=$(node -v 2>/dev/null || echo "v0.0.0")
    NODE_VER=$(echo "$NODE_RAW" | sed 's/v//' | cut -d'.' -f1)
    if [ "$NODE_VER" -ge 22 ]; then log_success "Node.js détecté : $NODE_RAW"
    else log_error "Node.js $NODE_RAW insuffisant (version ≥ 22 requise)."; exit 1; fi
  else log_error "Node.js n'est pas installé (version ≥ 22 requise)."; exit 1; fi
  # 3. pnpm
  if command -v pnpm &>/dev/null; then
    log_success "pnpm détecté : $(pnpm -v 2>/dev/null || echo 'OK')"
  else
    log_warn "pnpm n'est pas installé."
    if ask_confirm "Installer pnpm via npm/corepack ?" "Y"; then
      npm install -g pnpm@11.23.0 || corepack enable; log_success "pnpm installé."
    else log_error "pnpm est requis pour gérer le monorepo. Arrêt."; exit 1; fi
  fi
  # 4. Docker & Démon
  if command -v docker &>/dev/null; then
    if test_docker_daemon; then log_success "Docker & Démon opérationnels."
    else wait_for_docker_daemon 90; fi
  else log_error "Docker non installé (https://docs.docker.com/engine/install/)."; exit 1; fi
}

detect_ollama() {
  log_info "Détection de l'assistant IA local (Ollama)..."
  OLLAMA_AVAILABLE=false; LLAMA_MODEL_PRESENT=false
  if command -v ollama &>/dev/null; then
    OLLAMA_AVAILABLE=true
    if ollama list 2>/dev/null | grep -q "llama3.1:8b"; then
      LLAMA_MODEL_PRESENT=true; log_success "Ollama détecté avec 'llama3.1:8b'."
    else
      log_warn "Ollama actif mais modèle 'llama3.1:8b' absent."
      if ask_confirm "Télécharger 'llama3.1:8b' (~4.9 Go) ?" "Y"; then
        log_info "Téléchargement en cours..."; ollama pull llama3.1:8b || log_warn "Échec téléchargement."
        LLAMA_MODEL_PRESENT=true
      fi
    fi
  else
    log_warn "Ollama non détecté. Mentor IA configuré en mode désactivé (AI_ENABLED=false)."
  fi
}

generate_random_secret() {
  if command -v openssl &>/dev/null; then openssl rand -hex 32
  else head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; fi
}

get_env_val() {
  local key="$1" file="${2:-.env}"
  if [ -f "$file" ]; then grep "^${key}=" "$file" 2>/dev/null | head -n1 | cut -d'=' -f2- || true; fi
}

prepare_repository() {
  if [ -f "package.json" ] && grep -q '"name": "opensio"' package.json; then
    log_info "Répertoire OpenSIO existant détecté."
    if ask_confirm "Mettre à jour le projet existant (git pull) ?" "Y"; then git pull || log_warn "Échec git pull."; fi
  else
    if [ -d "$TARGET_DIR" ]; then cd "$TARGET_DIR"
    else log_info "Clonage du dépôt OpenSIO..."; git clone "$REPO_URL" "$TARGET_DIR"; cd "$TARGET_DIR"; fi
  fi
}

setup_development() {
  local with_seed="$1" with_ai="$2"
  log_info "Configuration de l'environnement de développement..."
  if [ ! -f ".env" ]; then
    cp .env.example .env
    RANDOM_JWT=$(generate_random_secret)$(generate_random_secret)
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=${RANDOM_JWT}|g" .env
    log_info "Fichier .env initialisé depuis le modèle."
  else
    log_info "Fichier .env existant détecté : les secrets existants sont préservés."
  fi

  if [ "$with_ai" = "true" ]; then sed -i "s|AI_ENABLED=.*|AI_ENABLED=true|g" .env
  else sed -i "s|AI_ENABLED=.*|AI_ENABLED=false|g" .env; fi

  if [ -f "apps/api/.env" ]; then
    if [ "$with_ai" = "true" ]; then sed -i "s|AI_ENABLED=.*|AI_ENABLED=true|g" apps/api/.env
    else sed -i "s|AI_ENABLED=.*|AI_ENABLED=false|g" apps/api/.env; fi
  fi

  log_info "Démarrage de PostgreSQL 18 (Docker)..."
  docker compose -f infra/docker/docker-compose.dev.yml up -d
  log_info "Installation des dépendances..."
  pnpm install
  log_info "Application des migrations Prisma..."
  pnpm --filter @opensio/api exec prisma migrate deploy
  if [ "$with_seed" = "true" ]; then log_info "Amorçage des données (Seed)..."; pnpm seed; fi
  log_info "Synchronisation du contenu pédagogique..."
  pnpm content:sync

  echo -e "\n${C_GREEN}${C_BOLD}================================================================${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}  🎉 OpenSIO est prêt en Mode Développement !${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}================================================================${C_RESET}\n"
  echo -e "  🌐 Frontend Web : ${C_CYAN}http://localhost:3000${C_RESET}"
  echo -e "  🔌 API Backend  : ${C_CYAN}http://localhost:4000/api/v1${C_RESET}\n"
  if [ "$with_seed" = "true" ]; then
    echo -e "  🔑 Comptes de test : admin@opensio.local (AdminOpenSIO2026!) / student@opensio.local (StudentOpenSIO2026!)\n"
  fi
  echo -e "  🚀 Lancer la plateforme : ${C_CYAN}pnpm dev${C_RESET}\n"
}

setup_production() {
  local domain="$1" with_seed="$2" with_ai="$3"
  log_info "Configuration de l'environnement de production..."
  local db_pass="" jwt_secret="" backup_key="" alter_user_needed="false"

  if [ -f ".env" ]; then
    local ex_pass ex_jwt ex_backup
    ex_pass=$(get_env_val "DB_PASSWORD" ".env")
    ex_jwt=$(get_env_val "JWT_SECRET" ".env")
    ex_backup=$(get_env_val "BACKUP_ENCRYPTION_KEY" ".env")
    if [ -n "$ex_pass" ] && [ -n "$ex_jwt" ]; then
      log_info "Configuration .env existante détectée."
      if ask_confirm "Conserver les secrets et mots de passe existants ?" "Y"; then
        db_pass="$ex_pass"; jwt_secret="$ex_jwt"; backup_key="${ex_backup:-$ex_jwt}"
      else
        log_warn "ATTENTION : La régénération modifiera le mot de passe BDD."
        if ask_confirm "Confirmez-vous réellement la régénération de TOUS les secrets ?" "N"; then
          db_pass=$(generate_random_secret | cut -c1-32)
          jwt_secret=$(generate_random_secret)$(generate_random_secret)
          backup_key=$(generate_random_secret)$(generate_random_secret)
          echo -e "\nGestion du mot de passe BDD existante :"
          echo -e "  [1] Mettre à jour la base active (ALTER USER via docker exec) [Recommandé]"
          echo -e "  [2] Réinitialiser le volume de données (Efface toutes les données)"
          echo -e "  [3] Ne pas toucher au conteneur (alignement manuel)"
          echo -ne "${C_BOLD}Votre choix [1/2/3] (défaut 1) : ${C_RESET}"
          local db_choice; read -r db_choice || db_choice="1"; db_choice="${db_choice:-1}"
          if [ "$db_choice" = "1" ]; then alter_user_needed="true"
          elif [ "$db_choice" = "2" ]; then docker compose -f docker-compose.prod.yml down -v 2>/dev/null || true; fi
        else db_pass="$ex_pass"; jwt_secret="$ex_jwt"; backup_key="${ex_backup:-$ex_jwt}"; fi
      fi
    fi
  fi

  if [ -z "$db_pass" ]; then
    db_pass=$(generate_random_secret | cut -c1-32)
    jwt_secret=$(generate_random_secret)$(generate_random_secret)
    backup_key=$(generate_random_secret)$(generate_random_secret)
  fi

  cat <<EOF > .env
NODE_ENV=production
APP_URL=https://${domain}
API_PORT=4000
DATABASE_URL=postgresql://opensio:${db_pass}@db:5432/opensio
DB_PASSWORD=${db_pass}
JWT_SECRET=${jwt_secret}
BACKUP_ENCRYPTION_KEY=${backup_key}
REGISTRATION_ENABLED=false
CONTENT_PATH=./content
LAB_RUNNER=simulation
TERMINAL_ENABLED=true
AI_ENABLED=${with_ai}
AI_BASE_URL=http://host.docker.internal:11434/v1
AI_MODEL=llama3.1:8b
EOF

  log_info "Lancement de la stack de production (docker-compose.prod.yml)..."
  if [ "$with_ai" = "true" ] && [ "$LLAMA_MODEL_PRESENT" = "false" ]; then
    docker compose -f docker-compose.prod.yml --profile ai up -d --build
  else
    docker compose -f docker-compose.prod.yml up -d --build
  fi

  if [ "$alter_user_needed" = "true" ]; then
    log_info "Application du nouveau mot de passe à PostgreSQL via ALTER USER..."
    sleep 3
    docker compose -f docker-compose.prod.yml exec -T db psql -U opensio -d opensio -c "ALTER USER opensio WITH PASSWORD '${db_pass}';" 2>/dev/null || true
  fi

  echo -e "\n${C_GREEN}${C_BOLD}================================================================${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}  🚀 OpenSIO est déployé en Mode Production !${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}================================================================${C_RESET}\n"
  echo -e "  🌐 Accès HTTPS   : ${C_CYAN}https://${domain}${C_RESET}"
  echo -e "  🔒 Reverse Proxy : Caddy (TLS Interne) | Sauvegardes : Chiffrées D-18\n"
  if [ "$with_seed" = "true" ]; then
    echo -e "  🔑 Comptes de test : admin@opensio.local (AdminOpenSIO2026!) / student@opensio.local (StudentOpenSIO2026!)\n"
  fi
  echo -e "  🛠 Commandes utiles : docker compose -f docker-compose.prod.yml logs -f\n"
}

main() {
  print_banner
  check_prerequisites
  detect_ollama
  prepare_repository

  echo -e "\n${C_BOLD}Choisissez le mode d'installation :${C_RESET}"
  echo -e "  ${C_CYAN}[1]${C_RESET} Mode Développement (PC local — BDD Docker + apps Node.js)"
  echo -e "  ${C_CYAN}[2]${C_RESET} Mode Production (Serveur / Homelab — Stack Docker durcie + Caddy HTTPS)"
  echo -ne "${C_BOLD}Votre choix [1/2] (défaut 1) : ${C_RESET}"
  read -r MODE_CHOICE || MODE_CHOICE="1"
  MODE_CHOICE="${MODE_CHOICE:-1}"

  WITH_SEED="true"
  if ! ask_confirm "Inclure les données et comptes de démonstration (Seed) ?" "Y"; then WITH_SEED="false"; fi

  WITH_AI="false"
  if [ "$LLAMA_MODEL_PRESENT" = "true" ]; then
    if ask_confirm "Activer le Mentor IA local ?" "Y"; then WITH_AI="true"; fi
  else
    if ask_confirm "Activer l'assistant IA (nécessitera clé distante / Ollama) ?" "N"; then WITH_AI="true"; fi
  fi

  if [ "$MODE_CHOICE" = "2" ]; then
    echo -ne "${C_BOLD}Nom de domaine ou hostname (défaut: opensio.home.lan) : ${C_RESET}"
    read -r PROD_DOMAIN || PROD_DOMAIN="opensio.home.lan"
    PROD_DOMAIN="${PROD_DOMAIN:-opensio.home.lan}"
    setup_production "$PROD_DOMAIN" "$WITH_SEED" "$WITH_AI"
  else
    setup_development "$WITH_SEED" "$WITH_AI"
  fi
}

main "$@"
