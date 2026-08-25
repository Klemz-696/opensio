#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Configuration d'un Nœud IA Dédié (Ollama Node)
# Prépare une machine Linux pour servir de serveur d'inférence distant sécurisé.
# ==============================================================================
set -euo pipefail

# Couleurs ANSI
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_CYAN='\033[36m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_BLUE='\033[34m'

DRY_RUN="false"
NON_INTERACTIVE="0"
TARGET_MODEL="llama3.1:8b"
LAN_SUBNET="192.168.1.0/24"

log_info()    { echo -e "${C_BLUE}ℹ${C_RESET}  $1"; }
log_success() { echo -e "${C_GREEN}✔${C_RESET}  $1"; }
log_warn()    { echo -e "${C_YELLOW}⚠${C_RESET}  $1"; }
log_error()   { echo -e "${C_RED}✖  $1${C_RESET}"; }
log_dry()     { echo -e "${C_YELLOW}[DRY-RUN]${C_RESET} $1"; }

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

print_security_warning() {
  echo -e "${C_RED}${C_BOLD}"
  echo "  ╔════════════════════════════════════════════════════════════════════════╗"
  echo "  ║                   AVERTISSEMENT DE SÉCURITÉ MAJEUR                     ║"
  echo "  ╠════════════════════════════════════════════════════════════════════════╣"
  echo "  ║ Ollama ne dispose d'AUCUN mécanisme d'authentification native.         ║"
  echo "  ║ Ce script configure Ollama pour écouter sur 0.0.0.0 (toutes interfaces)║"
  echo "  ║ et restreint STRICTEMENT l'accès au port 11434 via le pare-feu UFW     ║"
  echo "  ║ au sous-réseau local autorisé (${LAN_SUBNET}).                        ║"
  echo "  ║                                                                        ║"
  echo "  ║ NE JAMAIS EXPOSER LE PORT 11434 SUR INTERNET OU UN RÉSEAU PUBLIC.     ║"
  echo "  ╚════════════════════════════════════════════════════════════════════════╝"
  echo -e "${C_RESET}\n"
}

ask_confirm() {
  local prompt="$1" default="${2:-Y}" response
  if [ "$NON_INTERACTIVE" = "1" ]; then
    [[ "$default" =~ ^[oOyY] ]] && return 0 || return 1
  fi
  if [ "$default" = "Y" ] || [ "$default" = "y" ]; then
    echo -ne "${C_BOLD}${prompt} [O/n] : ${C_RESET}"
  else
    echo -ne "${C_BOLD}${prompt} [o/N] : ${C_RESET}"
  fi
  read -r response || response="$default"
  response="${response:-$default}"
  [[ "$response" =~ ^[oOyY] ]]
}

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

show_help() {
  cat << 'EOF'
OpenSIO — Configuration d'un Nœud Dédié Ollama

Usage :
  sudo ./scripts/setup-ollama-node.sh [OPTIONS]

Options :
  -m, --model <nom>       Modèle LLM à télécharger (défaut: llama3.1:8b)
  -s, --subnet <cidr>     Sous-réseau LAN autorisé pour le port 11434 (défaut: 192.168.1.0/24)
  -d, --dry-run           Mode simulation (affiche les actions sans exécution)
  -y, --non-interactive   Mode non interactif sans question
  -h, --help              Affiche cette aide et quitte
EOF
}

parse_arguments() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -m|--model)
        TARGET_MODEL="$2"
        shift 2
        ;;
      -s|--subnet)
        LAN_SUBNET="$2"
        shift 2
        ;;
      -d|--dry-run)
        DRY_RUN="true"
        shift
        ;;
      -y|--non-interactive)
        NON_INTERACTIVE="1"
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

check_root() {
  if [ "$DRY_RUN" = "true" ]; then return 0; fi
  if [ "$(id -u)" -ne 0 ]; then
    log_error "Ce script requiert les privilèges super-utilisateur (sudo)."
    exit 1
  fi
}

install_ollama() {
  if command -v ollama &>/dev/null; then
    log_success "Ollama est déjà installé sur le système ($(ollama --version 2>/dev/null || echo 'OK'))."
  else
    log_info "Installation d'Ollama via le script officiel..."
    if [ "$DRY_RUN" = "true" ]; then
      log_dry "curl -fsSL https://ollama.com/install.sh | sh"
    else
      curl -fsSL https://ollama.com/install.sh | sh
    fi
    log_success "Ollama installé."
  fi
}

configure_systemd_override() {
  log_info "Configuration de la directive systemd (OLLAMA_HOST=0.0.0.0)..."
  local override_dir="/etc/systemd/system/ollama.service.d"
  local override_file="${override_dir}/override.conf"

  if [ "$DRY_RUN" = "true" ]; then
    log_dry "mkdir -p ${override_dir}"
    log_dry "Écriture de Environment=\"OLLAMA_HOST=0.0.0.0\" dans ${override_file}"
    log_dry "systemctl daemon-reload && systemctl restart ollama"
    return 0
  fi

  mkdir -p "$override_dir"
  cat << 'EOF' > "$override_file"
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
EOF

  systemctl daemon-reload
  systemctl restart ollama
  log_success "Service Ollama configuré pour écouter sur toutes les interfaces locales."
}

pull_target_model() {
  log_info "Téléchargement du modèle IA '${TARGET_MODEL}'..."
  execute_cmd "Téléchargement modèle Ollama" ollama pull "$TARGET_MODEL"
  log_success "Modèle '${TARGET_MODEL}' prêt à l'emploi."
}

configure_ufw_firewall() {
  log_info "Configuration des règles de pare-feu UFW (Sous-réseau : ${LAN_SUBNET})..."
  if command -v ufw &>/dev/null; then
    execute_cmd "Autorisation UFW port 11434" ufw allow from "$LAN_SUBNET" to any port 11434 proto tcp comment "OpenSIO Ollama API"
    execute_cmd "Rechargement pare-feu UFW" ufw reload || true
    log_success "Pare-feu UFW configuré : port 11434 accessible uniquement depuis ${LAN_SUBNET}."
  else
    log_warn "UFW n'est pas installé sur ce système."
    echo -e "   ${C_CYAN}➜ Pensez à configurer votre pare-feu (nftables/iptables) pour restreindre le port 11434 au réseau ${LAN_SUBNET}.${C_RESET}"
  fi
}

print_final_summary() {
  local host_ip
  host_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "IP_DE_CE_SERVEUR")

  echo -e "\n${C_GREEN}${C_BOLD}================================================================${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}  🎉 Nœud IA Ollama OpenSIO configuré avec succès !${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}================================================================${C_RESET}\n"
  echo -e "  🤖 Modèle LLM installé    : ${C_CYAN}${TARGET_MODEL}${C_RESET}"
  echo -e "  🔒 Restriction réseau      : ${C_CYAN}${LAN_SUBNET}${C_RESET}"
  echo -e "  🌐 URL d'API pour OpenSIO : ${C_CYAN}http://${host_ip}:11434/v1${C_RESET}\n"
  echo -e "  💡 Pour rattacher ce nœud à la stack OpenSIO :"
  echo -e "     1. Sur le serveur OpenSIO, lancez ./scripts/install.sh"
  echo -e "     2. Sélectionnez le choix [3] Machine distante pour l'IA"
  echo -e "     3. Indiquez l'URL : http://${host_ip}:11434/v1\n"
}

main() {
  parse_arguments "$@"
  print_security_warning
  check_root

  if [ "$NON_INTERACTIVE" != "1" ]; then
    ask_input "Modèle LLM à déployer" "$TARGET_MODEL" "TARGET_MODEL"
    ask_input "Sous-réseau LAN autorisé (CIDR)" "$LAN_SUBNET" "LAN_SUBNET"
    echo ""
    if ! ask_confirm "Confirmez-vous la configuration de ce nœud Ollama ?" "Y"; then
      log_error "Opération annulée."
      exit 1
    fi
  fi

  install_ollama
  configure_systemd_override
  pull_target_model
  configure_ufw_firewall
  print_final_summary
}

main "$@"
