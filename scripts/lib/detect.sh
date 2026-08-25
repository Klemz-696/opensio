#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Module de Détection Système (lib/detect.sh)
# Phase 1 : Analyse de l'environnement, prérequis, ressources et ports
# ==============================================================================

# Variables globales de détection
export DETECTED_OS_NAME="Inconnu"
export DETECTED_OS_VERSION="0"
export DETECTED_RAM_GB="0"
export DETECTED_DISK_FREE_GB="0"
export DETECTED_VCPU="1"

export DETECTED_DOCKER_VERSION="0.0.0"
export DETECTED_COMPOSE_VERSION="0.0.0"
export DETECTED_GIT_VERSION="0.0.0"
export DETECTED_NODE_VERSION="0.0.0"
export DETECTED_PNPM_VERSION="0.0.0"

export IS_EXISTING_INSTALL=false

detect_os() {
  log_info "Détection du système d'exploitation et de la distribution..."
  if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    DETECTED_OS_NAME="${ID:-Linux}"
    DETECTED_OS_VERSION="${VERSION_ID:-0}"
    local pretty="${PRETTY_NAME:-$DETECTED_OS_NAME $DETECTED_OS_VERSION}"

    log_success "Système détecté : ${pretty}"

    # Vérification des distributions officiellement testées (Debian 12/13, Ubuntu 22.04+)
    local is_supported=false
    if [ "$DETECTED_OS_NAME" = "debian" ]; then
      local major_ver="${DETECTED_OS_VERSION%%.*}"
      if [ "$major_ver" -ge 12 ] 2>/dev/null; then is_supported=true; fi
    elif [ "$DETECTED_OS_NAME" = "ubuntu" ]; then
      if version_gte "$DETECTED_OS_VERSION" "22.04"; then is_supported=true; fi
    fi

    if [ "$is_supported" = "false" ]; then
      log_warn "La distribution '${pretty}' n'a pas été officiellement validée."
      echo -e "   ${C_CYAN}ℹ Distributions officiellement supportées : Debian 12/13, Ubuntu 22.04+${C_RESET}"
      if ! ask_confirm "Souhaitez-vous continuer l'installation tout de même ?" "Y"; then
        log_error "Installation interrompue par l'utilisateur."
        exit 1
      fi
    fi
  else
    log_warn "Fichier /etc/os-release absent. Système non standard."
    if ! ask_confirm "Continuer malgré tout ?" "Y"; then exit 1; fi
  fi
}

detect_hardware_resources() {
  log_info "Analyse des ressources matérielles de la machine..."

  # 1. RAM Totale (en Go)
  if [ -f /proc/meminfo ]; then
    DETECTED_RAM_GB=$(awk '/MemTotal/ {printf "%.1f", $2/1024/1024}' /proc/meminfo 2>/dev/null || echo "0")
  elif command -v sysctl &>/dev/null; then
    local mem_bytes
    mem_bytes=$(sysctl -n hw.memsize 2>/dev/null || echo "0")
    DETECTED_RAM_GB=$(awk -v b="$mem_bytes" 'BEGIN {printf "%.1f", b/1024/1024/1024}')
  elif [[ "$(uname -s 2>/dev/null)" =~ MINGW|MSYS|CYGWIN ]]; then
    DETECTED_RAM_GB="16.0"
  else
    DETECTED_RAM_GB="4.0"
  fi
  DETECTED_RAM_GB="${DETECTED_RAM_GB:-4.0}"

  # 2. Espace Disque Disponible (en Go)
  if [[ "$(uname -s 2>/dev/null)" =~ MINGW|MSYS|CYGWIN ]]; then
    DETECTED_DISK_FREE_GB="50.0"
  else
    DETECTED_DISK_FREE_GB=$(df -Pk . 2>/dev/null | awk 'NR==2 {printf "%.1f", $4/1024/1024}' || echo "50.0")
  fi
  DETECTED_DISK_FREE_GB="${DETECTED_DISK_FREE_GB:-50.0}"

  # 3. Nombre de vCPUs
  if command -v nproc &>/dev/null; then
    DETECTED_VCPU=$(nproc 2>/dev/null || echo "1")
  elif [ -f /proc/cpuinfo ]; then
    DETECTED_VCPU=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || echo "1")
  elif command -v sysctl &>/dev/null; then
    DETECTED_VCPU=$(sysctl -n hw.ncpu 2>/dev/null || echo "1")
  elif [ -n "${NUMBER_OF_PROCESSORS:-}" ]; then
    DETECTED_VCPU="$NUMBER_OF_PROCESSORS"
  else
    DETECTED_VCPU="2"
  fi
  DETECTED_VCPU="${DETECTED_VCPU:-2}"

  log_success "Ressources détectées : ${DETECTED_RAM_GB} Go RAM | ${DETECTED_VCPU} vCPU | ${DETECTED_DISK_FREE_GB} Go disque libre"

  # Avertissement disque si < 20 Go
  local disk_int="${DETECTED_DISK_FREE_GB%%.*}"
  disk_int="${disk_int:-0}"
  if [ "$disk_int" -lt 20 ]; then
    log_warn "Espace disque disponible faible (${DETECTED_DISK_FREE_GB} Go disponible, ≥ 20 Go recommandé)."
    if ! ask_confirm "Poursuivre malgré l'espace disque réduit ?" "Y"; then
      log_error "Arrêt de l'installation."
      exit 1
    fi
  fi
}

test_docker_daemon() {
  if [ "${DRY_RUN:-false}" = "true" ]; then return 0; fi
  docker info --format '{{.ServerVersion}}' >/dev/null 2>&1
}

wait_for_docker_daemon() {
  local timeout="${1:-90}"
  if [ "${DRY_RUN:-false}" = "true" ]; then
    log_dry "Simulation attente démon Docker"
    return 0
  fi
  log_warn "Docker est installé mais le démon n'est pas joignable."
  echo -e "   ${C_CYAN}➜ Sous Linux :${C_RESET} Exécutez 'sudo systemctl start docker'"
  echo -e "   ${C_CYAN}➜ Sous macOS / Windows :${C_RESET} Démarrez Docker Desktop\n"

  if command -v systemctl &>/dev/null; then
    log_info "Tentative de démarrage automatique du service Docker..."
    sudo systemctl start docker 2>/dev/null || true
  fi

  while true; do
    if ! ask_confirm "Souhaitez-vous attendre que le démon Docker réponde ?" "Y"; then
      log_error "Le démon Docker est obligatoire. Arrêt."
      exit 1
    fi

    log_info "Attente du démon Docker (délai max : ${timeout}s)..."
    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
      sleep 3
      elapsed=$((elapsed + 3))
      echo -ne "${C_YELLOW}.${C_RESET}"
      if test_docker_daemon; then
        echo ""
        log_success "Démon Docker opérationnel !"
        return 0
      fi
    done
    echo ""
    log_warn "Le démon Docker n'a pas répondu dans le délai (${timeout}s)."
  done
}

detect_tool_versions() {
  local target_mode="${1:-prod}"
  log_info "Vérification des versions logicielles requises..."

  # 1. Git (≥ 2.30)
  if command -v git &>/dev/null; then
    local git_raw
    git_raw=$(git --version 2>/dev/null || echo "git version 0.0.0")
    DETECTED_GIT_VERSION=$(echo "$git_raw" | grep -oE '[0-9]+(\.[0-9]+)+' | head -n1 || echo "0.0.0")
    if version_gte "$DETECTED_GIT_VERSION" "2.30"; then
      log_success "Git détecté : v${DETECTED_GIT_VERSION}"
    else
      log_warn "Git v${DETECTED_GIT_VERSION} est obsolète (version ≥ 2.30 requise)."
      if ask_confirm "Mettre à jour Git via le gestionnaire de paquets ?" "Y"; then
        if command -v apt-get &>/dev/null; then sudo apt-get update && sudo apt-get install -y git
        elif command -v dnf &>/dev/null; then sudo dnf install -y git
        elif command -v brew &>/dev/null; then brew install git
        fi
      fi
    fi
  else
    log_warn "Git n'est pas installé."
    if ask_confirm "Installer Git maintenant ?" "Y"; then
      if command -v apt-get &>/dev/null; then sudo apt-get update && sudo apt-get install -y git
      elif command -v dnf &>/dev/null; then sudo dnf install -y git
      elif command -v brew &>/dev/null; then brew install git
      else log_error "Gestionnaire de paquets inconnu. Installez Git manuellement."; exit 1; fi
    else
      log_error "Git est obligatoire pour OpenSIO. Arrêt."; exit 1
    fi
  fi

  # 2. Docker (≥ 24.0)
  if command -v docker &>/dev/null; then
    local docker_raw
    docker_raw=$(docker --version 2>/dev/null || echo "0.0.0")
    DETECTED_DOCKER_VERSION=$(echo "$docker_raw" | grep -oE '[0-9]+(\.[0-9]+)+' | head -n1 || echo "0.0.0")
    if version_gte "$DETECTED_DOCKER_VERSION" "24.0"; then
      log_success "Docker Engine détecté : v${DETECTED_DOCKER_VERSION}"
    else
      log_warn "Docker v${DETECTED_DOCKER_VERSION} est insuffisant (version ≥ 24.0 requise)."
    fi

    if test_docker_daemon; then
      log_success "Démon Docker opérationnel."
    else
      wait_for_docker_daemon 90
    fi
  else
    log_error "Docker n'est pas installé sur cette machine."
    echo -e "   ${C_CYAN}➜ Guide officiel : https://docs.docker.com/engine/install/${C_RESET}"
    exit 1
  fi

  # 3. Docker Compose plugin (≥ 2.20)
  if docker compose version &>/dev/null; then
    local compose_raw
    compose_raw=$(docker compose version 2>/dev/null || echo "0.0.0")
    DETECTED_COMPOSE_VERSION=$(echo "$compose_raw" | grep -oE '[0-9]+(\.[0-9]+)+' | head -n1 || echo "0.0.0")
    if version_gte "$DETECTED_COMPOSE_VERSION" "2.20"; then
      log_success "Docker Compose plugin détecté : v${DETECTED_COMPOSE_VERSION}"
    else
      log_warn "Docker Compose v${DETECTED_COMPOSE_VERSION} est obsolète (version ≥ 2.20 requise)."
    fi
  else
    log_error "Le plugin 'docker compose' (Compose v2) est introuvable."
    echo -e "   ${C_CYAN}➜ Installez 'docker-compose-plugin' via votre gestionnaire de paquets.${C_RESET}"
    exit 1
  fi

  # 4. Node.js & pnpm (uniquement en mode dev)
  if [ "$target_mode" = "dev" ]; then
    if command -v node &>/dev/null; then
      local node_raw
      node_raw=$(node -v 2>/dev/null || echo "v0.0.0")
      DETECTED_NODE_VERSION="${node_raw#v}"
      if version_gte "$DETECTED_NODE_VERSION" "20.0"; then
        log_success "Node.js détecté : v${DETECTED_NODE_VERSION}"
      else
        log_error "Node.js v${DETECTED_NODE_VERSION} insuffisant (version ≥ 20 requise en dev)."; exit 1
      fi
    else
      log_error "Node.js n'est pas installé (requis en mode développement)."; exit 1
    fi

    if command -v pnpm &>/dev/null; then
      local pnpm_raw
      pnpm_raw=$(pnpm -v 2>/dev/null || echo "0.0.0")
      DETECTED_PNPM_VERSION="${pnpm_raw#v}"
      if version_gte "$DETECTED_PNPM_VERSION" "9.0"; then
        log_success "pnpm détecté : v${DETECTED_PNPM_VERSION}"
      else
        log_warn "pnpm v${DETECTED_PNPM_VERSION} est insuffisant (version ≥ 9 requise)."
        if ask_confirm "Mettre à jour pnpm vers 11.23.0 ?" "Y"; then
          npm install -g pnpm@11.23.0 || corepack enable; log_success "pnpm mis à jour."
        else log_error "pnpm ≥ 9 est requis pour le monorepo. Arrêt."; exit 1; fi
      fi
    else
      log_warn "pnpm n'est pas installé."
      if ask_confirm "Installer pnpm via npm/corepack ?" "Y"; then
        npm install -g pnpm@11.23.0 || corepack enable; log_success "pnpm installé."
      else log_error "pnpm est requis pour gérer le monorepo. Arrêt."; exit 1; fi
    fi
  fi
}

is_port_busy() {
  local port="$1"
  if command -v ss &>/dev/null; then
    if ss -tuln 2>/dev/null | grep -qE "[: ]${port}[ \t]"; then return 0; fi
  elif command -v netstat &>/dev/null; then
    if netstat -tuln 2>/dev/null | grep -qE "[: ]${port}[ \t]"; then return 0; fi
  elif command -v lsof &>/dev/null; then
    if lsof -i ":${port}" &>/dev/null; then return 0; fi
  fi
  return 1
}

check_port_availability() {
  local ports=("$@")
  local busy_found=false
  log_info "Vérification de la disponibilité des ports réseau (${ports[*]} )..."

  for port in "${ports[@]}"; do
    if is_port_busy "$port"; then
      busy_found=true
      log_warn "Le port ${port} est actuellement occupé par un autre processus."
    fi
  done

  if [ "$busy_found" = "false" ]; then
    log_success "Tous les ports requis sont libres."
  fi
}

detect_existing_installation() {
  if [ -f "package.json" ] && grep -q '"name": "opensio"' package.json 2>/dev/null; then
    IS_EXISTING_INSTALL=true
    log_info "Installation OpenSIO existante détectée dans ce répertoire."
  elif [ -f ".env" ] && grep -q "APP_URL" .env 2>/dev/null; then
    IS_EXISTING_INSTALL=true
    log_info "Fichier de configuration OpenSIO existant (.env) détecté."
  fi
}

run_phase_detect() {
  echo -e "${C_BOLD}${C_CYAN}=== PHASE 1 / 3 : ANALYSE DE L'ENVIRONNEMENT ===${C_RESET}\n"
  detect_os
  detect_hardware_resources
  detect_existing_installation
  detect_tool_versions "prod"
  check_port_availability 80 443 3000 4000 5432 6379
  echo ""
}
