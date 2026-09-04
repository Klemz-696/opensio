#!/bin/bash
# ==============================================================================
# OpenSIO - Installateur Universel Interactif (macOS / Linux)
# Usage : bash <(curl -s https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.sh)
# Options :
#   --dir <chemin> : Dossier de destination personnalise (defaut : ~/opensio)
#   --dry-run      : Diagnostic des prerequis sans rien installer
# ==============================================================================
set -e

# --- Analyse des arguments ----------------------------------------------------
INSTALL_DIR=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir=*)
      INSTALL_DIR="${1#*=}"
      shift
      ;;
    --dir|-d)
      INSTALL_DIR="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# --- Couleurs & helpers -------------------------------------------------------
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[1;30m'
NC='\033[0m'

echo -e "\n${CYAN}  ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗ ██████╗ ${NC}"
echo -e "${CYAN} ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔═══██╗${NC}"
echo -e "${CYAN} ██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████╗██║██║   ██║${NC}"
echo -e "${CYAN} ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║╚════██║██║██║   ██║${NC}"
echo -e "${CYAN} ╚██████╔╝██║     ███████╗██║ ╚████║███████║██║╚██████╔╝${NC}"
echo -e "${CYAN}  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝ ${NC}\n"
echo -e "${GRAY}  La plateforme d'entraînement BTS SIO SISR${NC}"
echo -e "${GRAY}  Installateur automatique v1.0.1 (macOS / Linux)${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}  [DRY-RUN : Diagnostic uniquement — aucun changement]${NC}"
fi
echo -e "\n${GRAY}────────────────────────────────────────────────────────────${NC}\n"

step() { echo -e "${CYAN}▸ $1${NC}"; }
ok()   { echo -e "  ${GREEN}✓ $1${NC}"; }
warn() { echo -e "  ${YELLOW}! $1${NC}"; }
err()  { echo -e "  ${RED}✗ $1${NC}"; }
info() { echo -e "    ${GRAY}$1${NC}"; }

abort() {
  echo ""
  err "$1"
  echo ""
  echo -e "${GRAY}  Aide : https://github.com/Klemz-696/opensio/blob/main/docs/installation.md${NC}\n"
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

# --- Dossier d'installation ---------------------------------------------------
DEFAULT_DIR="$HOME/opensio"

if [ -z "$INSTALL_DIR" ]; then
  if [ "$DRY_RUN" = false ]; then
    step "Dossier d'installation"
    echo -e "  Dossier par défaut : ${CYAN}$DEFAULT_DIR${NC}"
    if [ -t 0 ] || [ -e /dev/tty ]; then
      read -r -p "  Où installer OpenSIO ? [Entrée = défaut] : " custom_dir </dev/tty || true
      INSTALL_DIR="${custom_dir:-$DEFAULT_DIR}"
    else
      INSTALL_DIR="$DEFAULT_DIR"
    fi
  else
    INSTALL_DIR="$DEFAULT_DIR"
  fi
fi

# Expansion de ~ si saisi
INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"

# Validation anti-dossiers système
for sys_dir in "/" "/etc" "/usr" "/bin" "/sbin" "/var" "/sys" "/proc" "/dev" "/boot" "/root"; do
  if [ "$INSTALL_DIR" = "$sys_dir" ]; then
    abort "Le dossier '$INSTALL_DIR' est un répertoire système protégé. Choisissez un autre emplacement."
  fi
done

# --- 1. Prérequis : Node.js ---------------------------------------------------
step "Vérification des prérequis"

if ! has_cmd node; then
  if [ "$DRY_RUN" = true ]; then
    warn "[DryRun] Node.js non trouvé — serait installé (v22 LTS)"
  else
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
fi

if has_cmd node; then
  NODE_VER=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 22 ]; then
    if [ "$DRY_RUN" = true ]; then
      warn "[DryRun] Node.js $NODE_VER détecté — version 22+ requise"
    else
      abort "Node.js $NODE_VER détecté — version 22+ requise. Mettez à jour Node.js."
    fi
  else
    ok "Node.js $NODE_VER"
  fi
fi

# --- 2. Prérequis : pnpm -----------------------------------------------------
if ! has_cmd pnpm; then
  if [ "$DRY_RUN" = true ]; then
    warn "[DryRun] pnpm non trouvé — serait configuré via corepack ou npm"
  else
    warn "pnpm non trouvé — activation..."
    if has_cmd corepack; then
      export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
      corepack enable 2>/dev/null || true
      corepack prepare pnpm@10 --activate 2>/dev/null || true
    fi
    if ! has_cmd pnpm; then
      if has_cmd npm; then
        sudo npm install -g pnpm || npm install -g pnpm
      else
        curl -fsSL https://get.pnpm.io/install.sh | sh -
        export PATH="$HOME/.local/share/pnpm:$PATH"
      fi
    fi
    if ! has_cmd pnpm; then
      abort "Impossible d'installer pnpm automatiquement. Exécutez : corepack enable && corepack prepare pnpm@10 --activate"
    fi
  fi
fi

if has_cmd pnpm; then
  PNPM_VER=$(pnpm --version)
  ok "pnpm v$PNPM_VER"
fi

# --- 3. Prérequis : Git ------------------------------------------------------
if ! has_cmd git; then
  if [ "$DRY_RUN" = true ]; then
    warn "[DryRun] Git non trouvé — serait installé via le gestionnaire de paquets"
  else
    warn "Git non trouvé — installation..."
    if [ "$OS" == "macOS" ]; then
      brew install git
    elif [ "$OS" == "debian" ]; then
      sudo apt-get install -y git
    else
      abort "Veuillez installer Git manuellement."
    fi
  fi
fi

if has_cmd git; then
  GIT_VER=$(git --version)
  ok "$GIT_VER"
fi

# --- 4. Prérequis : Docker Desktop / Engine ---------------------------------
if ! has_cmd docker; then
  if [ "$DRY_RUN" = true ]; then
    warn "[DryRun] Docker non trouvé — Docker est requis pour PostgreSQL"
  else
    warn "Docker non trouvé."
    echo ""
    echo -e "${YELLOW}  Docker est requis pour la base de données PostgreSQL.${NC}"
    echo -e "${CYAN}  Téléchargement : https://docs.docker.com/get-docker/${NC}"
    echo ""
    abort "Installez et démarrez Docker, puis relancez ce script."
  fi
else
  if ! docker info >/dev/null 2>&1; then
    if [ "$DRY_RUN" = true ]; then
      warn "[DryRun] Docker est installé mais le démon ne répond pas (service arrêté)"
    else
      warn "Docker est installé mais ne répond pas (Démon éteint ?)."
      echo ""
      if [ "$OS" == "macOS" ]; then
        info "Démarrage de Docker Desktop..."
        open -a Docker 2>/dev/null || true
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
      DOCKER_VER=$(docker --version)
      ok "$DOCKER_VER (démon actif)"
    fi
  else
    DOCKER_VER=$(docker --version)
    ok "$DOCKER_VER (démon actif)"
  fi
fi

echo ""

# --- Bilan Dry-Run ------------------------------------------------------------
if [ "$DRY_RUN" = true ]; then
  echo -e "${GRAY}────────────────────────────────────────────────────────────${NC}\n"
  echo -e "${GREEN}  [DryRun] Bilan terminé avec succès — aucune modification effectuée.${NC}"
  echo -e "${GRAY}  Dossier cible prévu : ${CYAN}$INSTALL_DIR${NC}\n"
  echo -e "${GRAY}────────────────────────────────────────────────────────────${NC}\n"
  exit 0
fi

# --- Téléchargement / Clonage -------------------------------------------------
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

# --- Installation des dépendances ---------------------------------------------
step "Installation des dépendances Node.js (pnpm install)"
info "Cela peut prendre 1 à 3 minutes au premier lancement..."
cd "$INSTALL_DIR"
if pnpm install; then
  ok "Dépendances installées avec succès"
else
  abort "pnpm install a échoué."
fi

echo ""

# --- Résumé et lancement ------------------------------------------------------
echo -e "${GRAY}────────────────────────────────────────────────────────────${NC}\n"
echo -e "${GREEN}  ✅  Installation terminée avec succès !${NC}\n"
echo -e "${GRAY}  OpenSIO est installé dans :${NC}"
echo -e "  ${CYAN}$INSTALL_DIR${NC}\n"
echo -e "${GRAY}  Pour y retourner :${NC}"
echo -e "    ${CYAN}cd \"$INSTALL_DIR\"${NC}"
echo -e "    ${CYAN}pnpm opensio${NC}\n"
echo -e "${GRAY}  Le lanceur va configurer :${NC}"
echo -e "${GRAY}    • La base de données PostgreSQL (Docker)${NC}"
echo -e "${GRAY}    • L'amorce du catalogue pédagogique SISR${NC}"
echo -e "${GRAY}    • L'API et l'interface web${NC}\n"
echo -e "${GRAY}────────────────────────────────────────────────────────────${NC}\n"

launch="o"
if [ -t 0 ] || [ -e /dev/tty ]; then
  read -r -p "  Lancer OpenSIO maintenant ? [O/n] " launch </dev/tty || true
fi

if [[ ! "$launch" =~ ^[nN]$ ]]; then
  pnpm opensio
else
  echo ""
  echo -e "${GRAY}  Pour lancer OpenSIO plus tard :${NC}"
  echo -e "${CYAN}    cd \"$INSTALL_DIR\" && pnpm opensio${NC}\n"
fi
