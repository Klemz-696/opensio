#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Module de Configuration Interactive (lib/config.sh)
# Phase 2 : Questions interactives, validation des choix, récapitulatif tabulaire
# ==============================================================================

# Variables de configuration résultantes
export CFG_MODE="prod"
export CFG_AI_MODE="4"
export CFG_AI_URL=""
export CFG_AI_MODEL="llama3.1:8b"
export CFG_AI_ENABLED="false"
export CFG_COMPOSE_PROFILE=""

export CFG_DOMAIN="opensio.home.lan"
export CFG_TLS_TYPE="internal"
export CFG_HTTP_PORT="80"
export CFG_HTTPS_PORT="443"
export CFG_API_PORT="4000"
export CFG_DB_PORT="5432"

export CFG_DB_PASSWORD=""
export CFG_JWT_SECRET=""
export CFG_BACKUP_KEY=""
export CFG_SEED_CHOICE="complet"

configure_mode() {
  if [ -n "${OPENSIO_MODE:-}" ]; then
    if [ "$OPENSIO_MODE" = "1" ] || [ "$OPENSIO_MODE" = "dev" ]; then CFG_MODE="dev"
    else CFG_MODE="prod"; fi
    return 0
  fi

  echo -e "\n${C_BOLD}1. Choisissez le mode d'installation :${C_RESET}"
  echo -e "  ${C_CYAN}[1]${C_RESET} Mode Développement (PC local — BDD Docker + applications Node.js en direct)"
  echo -e "  ${C_CYAN}[2]${C_RESET} Mode Production (Serveur / Homelab — Stack Docker durcie + Caddy HTTPS)"
  local choice
  ask_input "Votre choix [1/2]" "2" "choice"
  if [ "$choice" = "1" ] || [ "$choice" = "dev" ]; then
    CFG_MODE="dev"
  else
    CFG_MODE="prod"
  fi
}

configure_ai() {
  if [ "$CFG_MODE" = "dev" ]; then
    detect_local_ollama "$CFG_AI_MODEL"
    if [ -n "${OPENSIO_AI_MODE:-}" ]; then
      if [ "$OPENSIO_AI_MODE" = "4" ] || [ "$OPENSIO_AI_MODE" = "none" ] || [ "$OPENSIO_AI_MODE" = "false" ]; then
        CFG_AI_ENABLED="false"; CFG_AI_MODE="4"
      else
        CFG_AI_ENABLED="true"; CFG_AI_MODE="1"; CFG_AI_URL="http://127.0.0.1:11434/v1"
      fi
      return 0
    fi

    if [ "$OLLAMA_LOCAL_FOUND" = "true" ]; then
      if ask_confirm "Activer le Mentor IA local (Ollama détecté sur l'hôte) ?" "Y"; then
        CFG_AI_ENABLED="true"
        CFG_AI_MODE="1"
        CFG_AI_URL="http://127.0.0.1:11434/v1"
      else
        CFG_AI_ENABLED="false"
        CFG_AI_MODE="4"
      fi
    else
      if ask_confirm "Ollama est absent : activer tout de même le Mentor IA (nœud distant / ultérieur) ?" "N"; then
        CFG_AI_ENABLED="true"
        CFG_AI_MODE="3"
        ask_input "URL de l'API Ollama distante" "http://127.0.0.1:11434/v1" "CFG_AI_URL"
      else
        CFG_AI_ENABLED="false"
        CFG_AI_MODE="4"
      fi
    fi
    return 0
  fi

  # Mode Production
  if [ -n "${OPENSIO_AI_MODE:-}" ]; then
    CFG_AI_MODE="$OPENSIO_AI_MODE"
  else
    echo -e "\n${C_BOLD}2. Emplacement de l'assistant IA (Ollama) :${C_RESET}"
    echo -e "  ${C_CYAN}[1]${C_RESET} Installé sur l'hôte Linux local (recommandé avec GPU)"
    echo -e "  ${C_CYAN}[2]${C_RESET} Conteneurisé dans la stack Docker (profil compose 'ai')"
    echo -e "  ${C_CYAN}[3]${C_RESET} Machine / Serveur distant dédié (préparé via setup-ollama-node.sh)"
    echo -e "  ${C_CYAN}[4]${C_RESET} Sans IA (désactivé — dégradation gracieuse côté API)"
    ask_input "Votre choix [1/2/3/4]" "1" "CFG_AI_MODE"
  fi

  case "$CFG_AI_MODE" in
    1|"host")
      CFG_AI_MODE="1"
      CFG_AI_ENABLED="true"
      CFG_AI_URL="http://host.docker.internal:11434/v1"
      CFG_COMPOSE_PROFILE=""
      ;;
    2|"container"|"compose")
      CFG_AI_MODE="2"
      CFG_AI_ENABLED="true"
      CFG_AI_URL="http://ollama:11434/v1"
      CFG_COMPOSE_PROFILE="ai"
      ;;
    3|"remote")
      CFG_AI_MODE="3"
      CFG_AI_ENABLED="true"
      CFG_COMPOSE_PROFILE=""
      local remote_url="${OPENSIO_AI_URL:-}"
      if [ -z "$remote_url" ]; then
        ask_input "URL du serveur Ollama distant" "http://192.168.1.50:11434/v1" "remote_url"
      fi
      CFG_AI_URL="$remote_url"
      if [ "$NON_INTERACTIVE" != "1" ]; then
        probe_remote_ollama "$CFG_AI_URL" "$CFG_AI_MODEL" || true
      fi
      ;;
    *)
      CFG_AI_MODE="4"
      CFG_AI_ENABLED="false"
      CFG_AI_URL="http://127.0.0.1:11434/v1"
      CFG_COMPOSE_PROFILE=""
      ;;
  esac
}

configure_domain_and_network() {
  if [ "$CFG_MODE" = "dev" ]; then
    CFG_DOMAIN="localhost"
    CFG_HTTP_PORT="3000"
    CFG_API_PORT="4000"
    CFG_DB_PORT="5432"
    return 0
  fi

  echo -e "\n${C_BOLD}3. Configuration du domaine et du certificat TLS :${C_RESET}"
  local default_domain="${OPENSIO_DOMAIN:-opensio.home.lan}"
  ask_input "Nom de domaine ou nom d'hôte" "$default_domain" "CFG_DOMAIN"

  local tls_choice="${OPENSIO_TLS_TYPE:-}"
  if [ -z "$tls_choice" ]; then
    if [[ "$CFG_DOMAIN" =~ \.(lan|local|home|internal)$ ]] || [ "$CFG_DOMAIN" = "localhost" ]; then
      tls_choice="internal"
    else
      echo -e "  ${C_CYAN}[1]${C_RESET} Certificat TLS Interne (Caddy Local CA — recommandé pour LAN / IP)"
      echo -e "  ${C_CYAN}[2]${C_RESET} Certificat Public Automatique (Let's Encrypt / ACME — domaine public)"
      local tls_input
      ask_input "Type de certificat TLS [1/2]" "1" "tls_input"
      [ "$tls_input" = "2" ] && tls_choice="public" || tls_choice="internal"
    fi
  fi
  CFG_TLS_TYPE="$tls_choice"

  echo -e "\n${C_BOLD}4. Configuration des ports d'écoute :${C_RESET}"
  local p_http="${OPENSIO_HTTP_PORT:-80}"
  local p_https="${OPENSIO_HTTPS_PORT:-443}"
  ask_input "Port HTTP public" "$p_http" "CFG_HTTP_PORT"
  ask_input "Port HTTPS public" "$p_https" "CFG_HTTPS_PORT"

  # Validation des ports saisis
  if is_port_busy "$CFG_HTTP_PORT"; then
    log_warn "Attention : le port HTTP ${CFG_HTTP_PORT} semble déjà occupé sur l'hôte !"
  fi
  if is_port_busy "$CFG_HTTPS_PORT"; then
    log_warn "Attention : le port HTTPS ${CFG_HTTPS_PORT} semble déjà occupé sur l'hôte !"
  fi
}

configure_secrets() {
  echo -e "\n${C_BOLD}5. Mots de passe et secrets de sécurité :${C_RESET}"

  # Récupération éventuelle de secrets existants dans .env
  local existing_db_pass=""
  if [ -f ".env" ]; then
    existing_db_pass=$(grep "^DB_PASSWORD=" .env 2>/dev/null | head -n1 | cut -d'=' -f2- || true)
    CFG_JWT_SECRET=$(grep "^JWT_SECRET=" .env 2>/dev/null | head -n1 | cut -d'=' -f2- || true)
    CFG_BACKUP_KEY=$(grep "^BACKUP_ENCRYPTION_KEY=" .env 2>/dev/null | head -n1 | cut -d'=' -f2- || true)
  fi

  if [ -n "$existing_db_pass" ] && [ -n "$CFG_JWT_SECRET" ]; then
    log_info "Secrets existants détectés dans le fichier .env."
    if ask_confirm "Conserver les mots de passe et secrets existants ?" "Y"; then
      CFG_DB_PASSWORD="$existing_db_pass"
      return 0
    fi
  fi

  if [ -n "${OPENSIO_DB_PASSWORD:-}" ] && [ "$OPENSIO_DB_PASSWORD" != "auto" ]; then
    CFG_DB_PASSWORD="$OPENSIO_DB_PASSWORD"
  else
    local pass_choice="1"
    if [ "$NON_INTERACTIVE" != "1" ]; then
      echo -e "  ${C_CYAN}[1]${C_RESET} Générer un mot de passe robuste aléatoire (Recommandé)"
      echo -e "  ${C_CYAN}[2]${C_RESET} Saisir manuellement le mot de passe de la base PostgreSQL"
      ask_input "Choix mot de passe BDD [1/2]" "1" "pass_choice"
    fi

    if [ "$pass_choice" = "2" ]; then
      ask_input "Mot de passe PostgreSQL" "OpenSIO_SecurePass2026!" "CFG_DB_PASSWORD"
    else
      CFG_DB_PASSWORD=$(generate_secret 16)
    fi
  fi

  CFG_JWT_SECRET=$(generate_secret 32)$(generate_secret 32)
  CFG_BACKUP_KEY=$(generate_secret 32)$(generate_secret 32)
}

configure_seed() {
  echo -e "\n${C_BOLD}6. Jeu de données initial (Seed) :${C_RESET}"
  if [ -n "${OPENSIO_SEED:-}" ]; then
    case "$OPENSIO_SEED" in
      "minimal"|"min") CFG_SEED_CHOICE="minimal" ;;
      "aucun"|"none"|"false") CFG_SEED_CHOICE="aucun" ;;
      *) CFG_SEED_CHOICE="complet" ;;
    esac
    return 0
  fi

  echo -e "  ${C_CYAN}[1]${C_RESET} Complet (Compte Administrateur + Étudiant Démo SISR) [Défaut]"
  echo -e "  ${C_CYAN}[2]${C_RESET} Minimal (Compte Administrateur uniquement)"
  echo -e "  ${C_CYAN}[3]${C_RESET} Aucun (Base vierge sans utilisateurs initiaux)"
  local seed_input
  ask_input "Votre choix [1/2/3]" "1" "seed_input"
  case "$seed_input" in
    2) CFG_SEED_CHOICE="minimal" ;;
    3) CFG_SEED_CHOICE="aucun" ;;
    *) CFG_SEED_CHOICE="complet" ;;
  esac
}

display_scenario_assessment() {
  local req_ram=1
  local req_cpu=1
  local req_disk=20
  local scenario_desc="Stack Web/API autonome"

  if [ "$CFG_AI_MODE" = "1" ] || [ "$CFG_AI_MODE" = "2" ]; then
    req_ram=8
    req_cpu=4
    req_disk=30
    scenario_desc="Tout-en-un avec Ollama local / conteneurisé"
  elif [ "$CFG_AI_MODE" = "3" ]; then
    req_ram=2
    req_cpu=2
    scenario_desc="Stack avec Nœud Ollama IA distant"
  fi

  echo -e "\n${C_BOLD}Évaluation des ressources pour le scénario [${scenario_desc}] :${C_RESET}"
  local ram_num="${DETECTED_RAM_GB%%.*}"
  ram_num="${ram_num:-0}"

  if [ "$ram_num" -ge "$req_ram" ]; then
    log_success "Mémoire RAM : ${DETECTED_RAM_GB} Go disponible (Requis : >= ${req_ram} Go)"
  else
    log_warn "Mémoire RAM insuffisante : ${DETECTED_RAM_GB} Go détecté (Recommandé : >= ${req_ram} Go pour ce scénario) !"
  fi

  if [ "$DETECTED_VCPU" -ge "$req_cpu" ]; then
    log_success "Processeur : ${DETECTED_VCPU} vCPU disponible (Requis : >= ${req_cpu} vCPU)"
  else
    log_warn "Processeur modeste : ${DETECTED_VCPU} vCPU (Recommandé : >= ${req_cpu} vCPU)"
  fi

  local disk_num="${DETECTED_DISK_FREE_GB%%.*}"
  disk_num="${disk_num:-0}"
  if [ "$disk_num" -ge "$req_disk" ]; then
    log_success "Espace disque : ${DETECTED_DISK_FREE_GB} Go libre (Requis : >= ${req_disk} Go)"
  else
    log_warn "Espace disque restreint : ${DETECTED_DISK_FREE_GB} Go libre (Recommandé : >= ${req_disk} Go)"
  fi
}

display_recap_and_confirm() {
  echo -e "\n${C_BOLD}${C_CYAN}================================================================${C_RESET}"
  echo -e "${C_BOLD}${C_CYAN}  RÉCAPITULATIF DES CHOIX D'INSTALLATION OPENSIO${C_RESET}"
  echo -e "${C_BOLD}${C_CYAN}================================================================${C_RESET}"
  printf "  %-24s : %s\n" "Mode d'exécution" "$CFG_MODE"
  printf "  %-24s : %s\n" "Nom de domaine / Host" "$CFG_DOMAIN"
  printf "  %-24s : %s\n" "Certificat TLS" "$CFG_TLS_TYPE"
  printf "  %-24s : %s\n" "Ports publics (HTTP/HTTPS)" "${CFG_HTTP_PORT} / ${CFG_HTTPS_PORT}"
  local ai_summary="Désactivé"
  if [ "$CFG_AI_ENABLED" = "true" ]; then
    ai_summary="Activé (Mode ${CFG_AI_MODE}, Modèle: ${CFG_AI_MODEL})"
  fi
  printf "  %-24s : %s\n" "Assistant IA (Mentor)" "$ai_summary"
  if [ "$CFG_AI_ENABLED" = "true" ]; then
    printf "  %-24s : %s\n" "URL API Ollama" "$CFG_AI_URL"
  fi
  printf "  %-24s : %s\n" "Jeu de données (Seed)" "$CFG_SEED_CHOICE"
  printf "  %-24s : %s\n" "Mot de passe Postgres" "[Généré / Défini de manière sécurisée]"
  echo -e "${C_BOLD}${C_CYAN}================================================================${C_RESET}\n"

  display_scenario_assessment

  if [ "$NON_INTERACTIVE" != "1" ]; then
    echo ""
    if ! ask_confirm "Confirmez-vous le lancement de l'installation avec ces paramètres ?" "Y"; then
      log_error "Installation annulée par l'utilisateur."
      exit 1
    fi
  fi
}

run_phase_config() {
  echo -e "${C_BOLD}${C_CYAN}=== PHASE 2 / 3 : CONFIGURATION INTERACTIVE ===${C_RESET}"
  configure_mode
  configure_ai
  configure_domain_and_network
  configure_secrets
  configure_seed
  display_recap_and_confirm
}
