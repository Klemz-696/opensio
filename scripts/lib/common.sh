#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Module Commun (lib/common.sh)
# Fonctions de journalisation, prompts interactifs, cryptographie et utilitaires
# ==============================================================================

# Couleurs ANSI
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_CYAN='\033[36m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_BLUE='\033[34m'
C_DIM='\033[2m'

# Mode Dry-Run global (activé par flag --dry-run ou OPENSIO_DRY_RUN=1)
DRY_RUN="${OPENSIO_DRY_RUN:-false}"
NON_INTERACTIVE="${OPENSIO_NONINTERACTIVE:-0}"

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
  echo -e "${C_DIM}  Wizard d'installation interactif & orchestrateur automatisé${C_RESET}"
  echo -e "  ---------------------------------------------------------\n"
}

log_info()    { echo -e "${C_BLUE}ℹ${C_RESET}  $1"; }
log_success() { echo -e "${C_GREEN}✔${C_RESET}  $1"; }
log_warn()    { echo -e "${C_YELLOW}⚠${C_RESET}  $1"; }
log_error()   { echo -e "${C_RED}✖  $1${C_RESET}"; }
log_dry()     { echo -e "${C_YELLOW}[DRY-RUN]${C_RESET} $1"; }

# Pose une question Oui/Non (défaut 'Y' ou 'N')
ask_confirm() {
  local prompt="$1" default="${2:-Y}" response
  if [ "$NON_INTERACTIVE" = "1" ]; then
    [[ "$default" =~ ^[oOyY] ]] && return 0 || return 1
  fi

  if [ "$default" = "Y" ] || [ "$default" = "y" ] || [ "$default" = "O" ] || [ "$default" = "o" ]; then
    echo -ne "${C_BOLD}${prompt} [O/n] : ${C_RESET}"
  else
    echo -ne "${C_BOLD}${prompt} [o/N] : ${C_RESET}"
  fi

  read -r response || response="$default"
  response="${response:-$default}"
  [[ "$response" =~ ^[oOyY] ]]
}

# Demande une saisie texte avec valeur par défaut
ask_input() {
  local prompt="$1" default="$2" var_name="$3" response
  if [ "$NON_INTERACTIVE" = "1" ]; then
    eval "${var_name}=\"${default}\""
    return 0
  fi

  echo -ne "${C_BOLD}${prompt} [${default}] : ${C_RESET}"
  read -r response || response="$default"
  response="${response:-$default}"
  eval "${var_name}=\"${response}\""
}

# Génère une chaîne aléatoire hexadécimale sécurisée
generate_secret() {
  local bytes="${1:-32}"
  if command -v openssl &>/dev/null; then
    openssl rand -hex "$bytes"
  else
    head -c "$bytes" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# Compare deux versions sémantiques (retourne 0 si v1 >= v2, 1 sinon)
version_gte() {
  local v1="$1" v2="$2"
  # Nettoyage des préfixes 'v'
  v1="${v1#v}"
  v2="${v2#v}"

  if [ "$v1" = "$v2" ]; then
    return 0
  fi

  local IFS=.
  local -a ver1 ver2
  read -r -a ver1 <<< "$v1"
  read -r -a ver2 <<< "$v2"
  local i
  # Remplissage par 0 si longueurs inégales
  for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do ver1[i]=0; done
  for ((i=${#ver2[@]}; i<${#ver1[@]}; i++)); do ver2[i]=0; done

  for ((i=0; i<${#ver1[@]}; i++)); do
    local n1=${ver1[i]}
    local n2=${ver2[i]}
    # Extraction purement numérique
    n1="${n1%%[!0-9]*}"
    n2="${n2%%[!0-9]*}"
    n1="${n1:-0}"
    n2="${n2:-0}"

    if (( 10#$n1 > 10#$n2 )); then
      return 0
    fi
    if (( 10#$n1 < 10#$n2 )); then
      return 1
    fi
  done
  return 0
}

# Exécute une commande ou affiche sa simulation en mode dry-run
execute_cmd() {
  local desc="$1"
  shift
  if [ "$DRY_RUN" = "true" ]; then
    log_dry "${desc} : $*"
    return 0
  fi
  log_info "${desc}..."
  "$@"
}

# Exécute silencieusement une commande
execute_silent() {
  if [ "$DRY_RUN" = "true" ]; then
    log_dry "Commande silencieuse : $*"
    return 0
  fi
  "$@"
}
