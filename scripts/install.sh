#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Installeur Universel Interactif & Wizard 3 Phases
# Usage direct : ./scripts/install.sh [--dry-run] [-y|--non-interactive]
# Usage distant: curl -fsSL https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/install.sh | bash
# ==============================================================================
set -euo pipefail

# Gestion du terminal interactif lors de l'exécution via pipe (curl | bash)
if [ ! -t 0 ] && [ -e /dev/tty ] 2>/dev/null; then
  if (exec < /dev/tty) 2>/dev/null; then
    exec < /dev/tty
  fi
fi

RAW_BASE_URL="https://raw.githubusercontent.com/Klemz-696/opensio/main/scripts/lib"
TMP_LIB_DIR=""

cleanup() {
  if [ -n "$TMP_LIB_DIR" ] && [ -d "$TMP_LIB_DIR" ]; then
    rm -rf "$TMP_LIB_DIR"
  fi
}
trap cleanup EXIT INT TERM

# Résolution et chargement des modules de scripts/lib/
load_modules() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"

  if [ -n "$script_dir" ] && [ -d "${script_dir}/lib" ] && [ -f "${script_dir}/lib/common.sh" ]; then
    # Exécution locale depuis le dépôt cloné
    local lib_dir="${script_dir}/lib"
    # shellcheck source=scripts/lib/common.sh disable=SC1091
    . "${lib_dir}/common.sh"
    # shellcheck source=scripts/lib/detect.sh disable=SC1091
    . "${lib_dir}/detect.sh"
    # shellcheck source=scripts/lib/ollama.sh disable=SC1091
    . "${lib_dir}/ollama.sh"
    # shellcheck source=scripts/lib/config.sh disable=SC1091
    . "${lib_dir}/config.sh"
    # shellcheck source=scripts/lib/runner.sh disable=SC1091
    . "${lib_dir}/runner.sh"
  else
    # Exécution distante via curl : téléchargement éphémère des modules
    TMP_LIB_DIR=$(mktemp -d /tmp/opensio-lib-XXXXXX)
    local modules=("common.sh" "detect.sh" "ollama.sh" "config.sh" "runner.sh")
    for mod in "${modules[@]}"; do
      if ! curl -fsSL "${RAW_BASE_URL}/${mod}" -o "${TMP_LIB_DIR}/${mod}"; then
        echo "Erreur critique : impossible de télécharger le module d'installation ${mod}." >&2
        exit 1
      fi
    done
    # shellcheck disable=SC1090,SC1091
    . "${TMP_LIB_DIR}/common.sh"
    # shellcheck disable=SC1090,SC1091
    . "${TMP_LIB_DIR}/detect.sh"
    # shellcheck disable=SC1090,SC1091
    . "${TMP_LIB_DIR}/ollama.sh"
    # shellcheck disable=SC1090,SC1091
    . "${TMP_LIB_DIR}/config.sh"
    # shellcheck disable=SC1090,SC1091
    . "${TMP_LIB_DIR}/runner.sh"
  fi
}

show_help() {
  cat << 'EOF'
OpenSIO — Installeur Universel Interactif

Usage :
  ./scripts/install.sh [OPTIONS]

Options :
  -d, --dry-run           Mode simulation : affiche toutes les actions sans les exécuter
  -y, --non-interactive   Mode non interactif (utilise les variables d'environnement)
  -h, --help              Affiche cette aide et quitte

Variables d'environnement (Mode non interactif) :
  OPENSIO_MODE            Mode d'installation : 'dev' ou 'prod' (défaut: prod)
  OPENSIO_AI_MODE         Emplacement Ollama : 1 (hôte), 2 (conteneur), 3 (distant), 4 (sans IA)
  OPENSIO_AI_URL          URL API Ollama si mode distant (ex: http://192.168.1.50:11434/v1)
  OPENSIO_AI_MODEL        Modèle IA demandé (défaut: llama3.1:8b)
  OPENSIO_DOMAIN          Nom de domaine ou hostname (défaut: opensio.home.lan)
  OPENSIO_TLS_TYPE        Type de TLS : 'internal' (Caddy CA) ou 'public' (Let's Encrypt)
  OPENSIO_HTTP_PORT       Port HTTP public (défaut: 80)
  OPENSIO_HTTPS_PORT      Port HTTPS public (défaut: 443)
  OPENSIO_DB_PASSWORD     Mot de passe Postgres ('auto' pour génération aléatoire)
  OPENSIO_SEED            Jeu de données : 'complet', 'minimal' ou 'aucun' (défaut: complet)
EOF
}

parse_arguments() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -d|--dry-run)
        export OPENSIO_DRY_RUN="true"
        export DRY_RUN="true"
        shift
        ;;
      -y|--non-interactive)
        export OPENSIO_NONINTERACTIVE="1"
        export NON_INTERACTIVE="1"
        shift
        ;;
      -h|--help)
        show_help
        exit 0
        ;;
      *)
        echo "Option inconnue : $1" >&2
        show_help
        exit 1
        ;;
    esac
  done
}

main() {
  parse_arguments "$@"
  load_modules

  print_banner
  run_phase_detect
  run_phase_config
  run_phase_execute
}

main "$@"
