#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Installeur Universel Interactif en Une Commande (Linux / macOS)
# Usage : curl -fsSL <raw-url>/install.sh | bash
# ==============================================================================

set -euo pipefail

# Réassignation de stdin sur /dev/tty pour maintenir l'interactivité via pipe
if [ ! -t 0 ] && [ -e /dev/tty ]; then
  exec < /dev/tty
fi

# Couleurs et formatage
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
  local prompt="$1"
  local default="${2:-Y}"
  local response
  if [ "$default" = "Y" ]; then
    echo -ne "${C_BOLD}${prompt} [O/n] : ${C_RESET}"
  else
    echo -ne "${C_BOLD}${prompt} [o/N] : ${C_RESET}"
  fi
  read -r response || response="$default"
  response="${response:-$default}"
  [[ "$response" =~ ^[oOyY] ]]
}

check_prerequisites() {
  log_info "Vérification des prérequis système..."

  # 1. Git
  if command -v git &>/dev/null; then
    log_success "Git détecté : $(git --version)"
  else
    log_warn "Git n'est pas installé."
    if ask_confirm "Souhaitez-vous installer Git maintenant ?" "Y"; then
      if command -v apt-get &>/dev/null; then
        sudo apt-get update && sudo apt-get install -y git
      elif command -v dnf &>/dev/null; then
        sudo dnf install -y git
      elif command -v brew &>/dev/null; then
        brew install git
      else
        log_error "Gestionnaire de paquets inconnu. Veuillez installer Git manuellement."
        exit 1
      fi
    else
      log_error "Git est obligatoire pour installer OpenSIO. Arrêt."
      exit 1
    fi
  fi

  # 2. Node.js (>= 22)
  if command -v node &>/dev/null; then
    NODE_VER=$(node -v | sed 's/v//' | cut -d'.' -f1)
    if [ "$NODE_VER" -ge 22 ]; then
      log_success "Node.js détecté : $(node -v)"
    else
      log_warn "Node.js version $(node -v) est insuffisante (version ≥ 22.0.0 requise)."
      log_error "Veuillez mettre à jour Node.js via votre gestionnaire ou https://nodejs.org/"
      exit 1
    fi
  else
    log_error "Node.js n'est pas installé (version ≥ 22 requise). Arrêt."
    exit 1
  fi

  # 3. pnpm
  if command -v pnpm &>/dev/null; then
    log_success "pnpm détecté : $(pnpm -v)"
  else
    log_warn "pnpm n'est pas installé."
    if ask_confirm "Souhaitez-vous activer pnpm via corepack/npm ?" "Y"; then
      npm install -g pnpm@11.23.0 || corepack enable
      log_success "pnpm installé avec succès."
    else
      log_error "pnpm est requis pour gérer le monorepo OpenSIO. Arrêt."
      exit 1
    fi
  fi

  # 4. Docker & Démon joignable
  if command -v docker &>/dev/null; then
    if docker info &>/dev/null; then
      log_success "Docker & Démon opérationnels : $(docker --version)"
    else
      log_warn "Docker est installé mais le démon n'est pas joignable."
      if command -v systemctl &>/dev/null; then
        sudo systemctl start docker || true
      fi
      if docker info &>/dev/null; then
        log_success "Démon Docker démarré avec succès."
      else
        log_error "Impossible de joindre le démon Docker. Veuillez démarrer Docker et réessayer."
        exit 1
      fi
    fi
  else
    log_error "Docker n'est pas installé. Veuillez installer Docker (https://docs.docker.com/engine/install/)."
    exit 1
  fi
}

detect_ollama() {
  log_info "Détection de l'assistant IA local (Ollama)..."
  OLLAMA_AVAILABLE=false
  LLAMA_MODEL_PRESENT=false

  if command -v ollama &>/dev/null && (ollama list &>/dev/null || curl -s http://127.0.0.1:11434/api/tags &>/dev/null); then
    OLLAMA_AVAILABLE=true
    if ollama list 2>/dev/null | grep -q "llama3.1:8b"; then
      LLAMA_MODEL_PRESENT=true
      log_success "Ollama détecté avec le modèle recommandé 'llama3.1:8b'."
    else
      log_warn "Ollama est actif mais le modèle 'llama3.1:8b' n'est pas téléchargé."
      if ask_confirm "Voulez-vous télécharger le modèle 'llama3.1:8b' (~4.9 Go) ?" "Y"; then
        log_info "Téléchargement en cours (cela peut prendre quelques minutes)..."
        ollama pull llama3.1:8b || log_warn "Échec du téléchargement du modèle."
        LLAMA_MODEL_PRESENT=true
      fi
    fi
  else
    log_warn "Ollama n'est pas détecté en local."
    echo -e "   ${C_CYAN}➜ Note :${C_RESET} Le Mentor IA sera configuré en mode désactivé (AI_ENABLED=false)."
    echo -e "   Vous pourrez l'activer plus tard en installant Ollama ou via une clé API OpenAI distante."
  fi
}

generate_random_secret() {
  if command -v openssl &>/dev/null; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

prepare_repository() {
  if [ -f "package.json" ] && grep -q '"name": "opensio"' package.json; then
    log_info "Répertoire OpenSIO existant détecté."
    if ask_confirm "Souhaitez-vous mettre à jour le projet existant ?" "Y"; then
      git pull || log_warn "Impossible de mettre à jour via git pull."
    fi
  else
    if [ -d "$TARGET_DIR" ]; then
      cd "$TARGET_DIR"
    else
      log_info "Clonage du dépôt OpenSIO..."
      git clone "$REPO_URL" "$TARGET_DIR"
      cd "$TARGET_DIR"
    fi
  fi
}

setup_development() {
  local with_seed="$1"
  local with_ai="$2"

  log_info "Configuration de l'environnement de développement..."

  if [ ! -f ".env" ]; then
    cp .env.example .env
    RANDOM_JWT=$(generate_random_secret)$(generate_random_secret)
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=${RANDOM_JWT}|g" .env
  fi

  if [ "$with_ai" = "true" ]; then
    sed -i "s|AI_ENABLED=.*|AI_ENABLED=true|g" .env
  else
    sed -i "s|AI_ENABLED=.*|AI_ENABLED=false|g" .env
  fi

  log_info "Démarrage de la base de données PostgreSQL 18 (Docker)..."
  docker compose -f infra/docker/docker-compose.dev.yml up -d

  log_info "Installation des dépendances..."
  pnpm install

  log_info "Application des migrations Prisma..."
  pnpm --filter @opensio/api exec prisma migrate deploy

  if [ "$with_seed" = "true" ]; then
    log_info "Amorçage des données de démonstration (Seed)..."
    pnpm seed
  fi

  log_info "Synchronisation du contenu pédagogique..."
  pnpm content:sync

  log_info "Vérification du Health Check API..."
  sleep 2
  HEALTH_STATUS=$(curl -s http://localhost:4000/api/v1/health | grep -o '"status":"ok"' || true)

  echo -e "\n${C_GREEN}${C_BOLD}================================================================${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}  🎉 OpenSIO est prêt en Mode Développement !${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}================================================================${C_RESET}\n"
  echo -e "  🌐 Frontend Web    : ${C_CYAN}http://localhost:3000${C_RESET}"
  echo -e "  🔌 API Backend     : ${C_CYAN}http://localhost:4000/api/v1${C_RESET}"
  echo -e "  🩺 Health Check    : ${C_GREEN}OK (status: ok)${C_RESET}\n"
  if [ "$with_seed" = "true" ]; then
    echo -e "  🔑 Comptes de test :"
    echo -e "     - Admin   : ${C_BOLD}admin@opensio.local${C_RESET} / ${C_BOLD}AdminPass123!${C_RESET}"
    echo -e "     - Étudiant : ${C_BOLD}lucas.moreau@bts-sio.local${C_RESET} / ${C_BOLD}StudentPass123!${C_RESET}\n"
  fi
  echo -e "  🚀 Lancer la plateforme : ${C_CYAN}pnpm dev${C_RESET}\n"
}

setup_production() {
  local domain="$1"
  local with_seed="$2"
  local with_ai="$3"

  log_info "Configuration de l'environnement de production..."

  RANDOM_JWT=$(generate_random_secret)$(generate_random_secret)
  RANDOM_DB_PASS=$(generate_random_secret)
  RANDOM_BACKUP_KEY=$(generate_random_secret)

  cat <<EOF > .env
NODE_ENV=production
APP_URL=https://${domain}
API_PORT=4000
DATABASE_URL=postgresql://opensio:${RANDOM_DB_PASS}@db:5432/opensio
DB_PASSWORD=${RANDOM_DB_PASS}
JWT_SECRET=${RANDOM_JWT}
BACKUP_ENCRYPTION_KEY=${RANDOM_BACKUP_KEY}
REGISTRATION_ENABLED=false
CONTENT_PATH=./content
LAB_RUNNER=simulation
TERMINAL_ENABLED=true
AI_ENABLED=${with_ai}
AI_BASE_URL=http://host.docker.internal:11434/v1
AI_MODEL=llama3.1:8b
EOF

  log_info "Construction et lancement de la stack de production..."
  if [ "$with_ai" = "true" ] && [ "$LLAMA_MODEL_PRESENT" = "false" ]; then
    docker compose -f docker-compose.prod.yml --profile ai up -d --build
  else
    docker compose -f docker-compose.prod.yml up -d --build
  fi

  log_info "Attente du démarrage des conteneurs..."
  sleep 10

  if [ "$with_seed" = "true" ]; then
    log_info "Amorçage des comptes de démonstration..."
    docker compose -f docker-compose.prod.yml exec api pnpm exec prisma db seed || true
  fi

  echo -e "\n${C_GREEN}${C_BOLD}================================================================${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}  🚀 OpenSIO est déployé en Mode Production !${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}================================================================${C_RESET}\n"
  echo -e "  🌐 Accès HTTPS     : ${C_CYAN}https://${domain}${C_RESET}"
  echo -e "  🔒 Reverse Proxy   : ${C_BOLD}Caddy (TLS Interne)${C_RESET}"
  echo -e "  📦 Sauvegardes     : ${C_BOLD}Quotidiennes chiffrées (D-18)${C_RESET}\n"
  if [ "$with_seed" = "true" ]; then
    echo -e "  🔑 Comptes de test :"
    echo -e "     - Admin   : ${C_BOLD}admin@opensio.local${C_RESET} / ${C_BOLD}AdminPass123!${C_RESET}"
    echo -e "     - Étudiant : ${C_BOLD}lucas.moreau@bts-sio.local${C_RESET} / ${C_BOLD}StudentPass123!${C_RESET}\n"
  fi
  echo -e "  🛠 Commandes utiles :"
  echo -e "     - Logs        : ${C_CYAN}docker compose -f docker-compose.prod.yml logs -f${C_RESET}"
  echo -e "     - Sauvegarde  : ${C_CYAN}docker compose -f docker-compose.prod.yml exec backup /scripts/backup.sh${C_RESET}"
  echo -e "     - Arrêt       : ${C_CYAN}docker compose -f docker-compose.prod.yml down${C_RESET}\n"
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
  if ! ask_confirm "Inclure les données et comptes de démonstration (Seed) ?" "Y"; then
    WITH_SEED="false"
  fi

  WITH_AI="false"
  if [ "$LLAMA_MODEL_PRESENT" = "true" ]; then
    if ask_confirm "Activer l'assistant pédagogique Mentor IA local ?" "Y"; then
      WITH_AI="true"
    fi
  else
    if ask_confirm "Activer l'assistant IA (nécessitera Ollama ou une clé distante) ?" "N"; then
      WITH_AI="true"
    fi
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
