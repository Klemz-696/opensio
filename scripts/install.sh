#!/bin/bash
# ==============================================================================
# OpenSIO - Installateur Universel Interactif (macOS / Linux)
# Usage : bash <(curl -s https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.sh)
# ==============================================================================
set -e

# ─── Couleurs & helpers ──────────────────────────────────────────────────────
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[1;30m'
NC='\033[0m' # No Color

echo -e "\n${CYAN}  ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗ ██████╗ ${NC}"
echo -e "${CYAN} ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔═══██╗${NC}"
echo -e "${CYAN} ██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████╗██║██║   ██║${NC}"
echo -e "${CYAN} ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║╚════██║██║██║   ██║${NC}"
echo -e "${CYAN} ╚██████╔╝██║     ███████╗██║ ╚████║███████║██║╚██████╔╝${NC}"
echo -e "${CYAN}  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝ ${NC}\n"
echo -e "${GRAY}  La plateforme d'entraînement BTS SIO SISR${NC}"
echo -e "${GRAY}  Installateur automatique v1.0 (macOS / Linux)${NC}\n"
echo -e "${GRAY}────────────────────────────────────────────────────────────${NC}\n"

step() { echo -e "${CYAN}▸ $1${NC}"; }
ok() { echo -e "  ${GREEN}✓ $1${NC}"; }
warn() { echo -e "  ${YELLOW}! $1${NC}"; }
err() { echo -e "  ${RED}✗ $1${NC}"; }
info() { echo -e "    ${GRAY}$1${NC}"; }

abort() {
  echo ""
  err "$1"
  echo ""
  echo -e "${GRAY}  Aide : https://github.com/Klemz-696/opensio#-démarrage-rapide${NC}\n"
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

get_os() {
  if [ "$(uname)" == "Darwin" ]; then
    echo "macOS"
  elif has_cmd apt-get; then
    echo "debian"
  elif has_cmd dnf; then
    echo "fedora"
  elif has_cmd pacman; then
    echo "arch"
  else
    echo "unknown"
  fi
}

OS=$(get_os)

# ─── 1. Prérequis : Node.js ──────────────────────────────────────────────────
step "Vérification des prérequis"

if ! has_cmd node; then
  warn "Node.js non trouvé."
  info "Installation de Node.js (v22 LTS)..."
  if [ "$OS" == "macOS" ]; then
    if ! has_cmd brew; then abort "Homebrew est requis sur macOS pour l'installation automatique. Installez-le d'abord."; fi
    brew install node@22
    brew link --overwrite node@22
  elif [ "$OS" == "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    abort "Système d'exploitation non pris en charge pour l'installation auto de Node.js. Installez Node v22+ puis relancez."
  fi
fi

NODE_VER=$(node --version)
NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 22 ]; then
  abort "Node.js $NODE_VER détecté — version 22+ requise. Mettez à jour Node.js."
fi
ok "Node.js $NODE_VER"

# ─── 2. Prérequis : pnpm ────────────────────────────────────────────────────
if ! has_cmd pnpm; then
  warn "pnpm non trouvé — installation..."
  if has_cmd npm; then
    sudo npm install -g pnpm || npm install -g pnpm
  else
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    export PATH="$HOME/.local/share/pnpm:$PATH"
  fi
fi
PNPM_VER=$(pnpm --version)
ok "pnpm v$PNPM_VER"

# ─── 3. Prérequis : Git ─────────────────────────────────────────────────────
if ! has_cmd git; then
  warn "Git non trouvé — installation..."
  if [ "$OS" == "macOS" ]; then
    brew install git
  elif [ "$OS" == "debian" ]; then
    sudo apt-get install -y git
  else
    abort "Veuillez installer Git manuellement."
  fi
fi
GIT_VER=$(git --version)
ok "$GIT_VER"

# ─── 4. Prérequis : Docker Desktop / Engine ────────────────────────────────
if ! has_cmd docker; then
  warn "Docker non trouvé."
  echo ""
  echo -e "${YELLOW}  Docker est requis pour la base de données PostgreSQL.${NC}"
  echo -e "${CYAN}  Téléchargement : https://docs.docker.com/get-docker/${NC}"
  echo ""
  abort "Installez et démarrez Docker, puis relancez ce script."
fi

if ! docker info >/dev/null 2>&1; then
  warn "Docker est installé mais ne répond pas (Daemon éteint ?)."
  echo ""
  if [ "$OS" == "macOS" ]; then
    info "Démarrage de Docker Desktop..."
    open -a Docker
    info "Attente de Docker (jusqu'à 60s)..."
    for _ in {1..12}; do
      sleep 5
      if docker info >/dev/null 2>&1; then break; fi
      echo -n "."
    done
    echo ""
  else
    info "Essayez de démarrer le service : sudo systemctl start docker"
  fi
  
  if ! docker info >/dev/null 2>&1; then
    abort "Docker ne répond pas. Démarrez-le manuellement, attendez qu'il soit prêt, puis relancez."
  fi
fi
DOCKER_VER=$(docker --version)
ok "$DOCKER_VER"

echo ""

# ─── 5. Dossier d'installation ──────────────────────────────────────────────
step "Dossier d'installation"
DEFAULT_DIR="$HOME/Desktop/opensio"
if [ ! -d "$HOME/Desktop" ]; then
  DEFAULT_DIR="$HOME/opensio"
fi

echo -n -e "  Dossier par défaut : ${CYAN}$DEFAULT_DIR${NC}\n"
read -r -p "  Appuyez sur Entrée pour accepter, ou entrez un chemin personnalisé : " custom_dir

INSTALL_DIR=${custom_dir:-$DEFAULT_DIR}
eval INSTALL_DIR="$INSTALL_DIR" # Expand ~ if used

# ─── 6. Clone ou mise à jour ─────────────────────────────────────────────────
step "Téléchargement du projet"
REPO_URL="https://github.com/Klemz-696/opensio.git"

if [ -d "$INSTALL_DIR/.git" ]; then
  info "Projet déjà présent — mise à jour..."
  cd "$INSTALL_DIR"
  if git pull --ff-only >/dev/null 2>&1; then
    ok "Projet mis à jour"
  else
    warn "git pull impossible — utilisation de la version existante."
  fi
else
  info "Clonage depuis GitHub..."
  info "Destination : $INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  if git clone "$REPO_URL" "$INSTALL_DIR" >/dev/null 2>&1; then
    ok "Projet cloné avec succès"
  else
    abort "Le clonage a échoué. Vérifiez votre connexion internet."
  fi
fi

echo ""

# ─── 7. Installation des dépendances ────────────────────────────────────────
step "Installation des dépendances Node.js"
info "Cela peut prendre 1 à 3 minutes au premier lancement..."
cd "$INSTALL_DIR"
if pnpm install >/dev/null 2>&1; then
  ok "Dépendances installées"
else
  abort "pnpm install a échoué."
fi

echo ""

# ─── 8. Résumé et lancement ─────────────────────────────────────────────────
echo -e "${GRAY}────────────────────────────────────────────────────────────${NC}\n"
echo -e "${GREEN}  ✅  Installation terminée !${NC}\n"
echo -e "${GRAY}  OpenSIO est installé dans :${NC}"
echo -e "${CYAN}  $INSTALL_DIR${NC}\n"
echo -e "${GRAY}  Le lanceur va maintenant :${NC}"
echo -e "${GRAY}    • Configurer la base de données PostgreSQL (Docker)${NC}"
echo -e "${GRAY}    • Initialiser le catalogue (seed + synchronisation)${NC}"
echo -e "${GRAY}    • Démarrer l'API et l'interface web${NC}\n"
echo -e "${YELLOW}  La prochaine fois : tapez 'pnpm opensio' dans le dossier du projet${NC}\n"
echo -e "${GRAY}────────────────────────────────────────────────────────────${NC}\n"

read -r -p "  Lancer OpenSIO maintenant ? [O/n] " launch
if [[ ! "$launch" =~ ^[nN]$ ]]; then
  pnpm opensio
else
  echo ""
  echo -e "${GRAY}  Pour lancer OpenSIO plus tard :${NC}"
  echo -e "${CYAN}    cd \"$INSTALL_DIR\"${NC}"
  echo -e "${CYAN}    pnpm opensio${NC}\n"
fi
