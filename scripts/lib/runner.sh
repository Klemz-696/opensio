#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Module d'Exécution Séquentielle (lib/runner.sh)
# Phase 3 : Enchaînement sans interruption (clone/pull, .env, compose, migrations, seed)
# ==============================================================================

REPO_URL="https://github.com/Klemz-696/opensio.git"
TARGET_DIR="opensio"

prepare_repository() {
  if [ -f "package.json" ] && grep -q '"name": "opensio"' package.json 2>/dev/null; then
    log_info "Répertoire du projet OpenSIO actif."
    if [ "$IS_EXISTING_INSTALL" = "true" ]; then
      execute_cmd "Mise à jour du code source (git pull)" git pull || log_warn "Échec du git pull (fichiers modifiés localement ?)"
    fi
  else
    if [ -d "$TARGET_DIR" ]; then
      cd "$TARGET_DIR" || exit 1
    else
      execute_cmd "Clonage du dépôt OpenSIO" git clone "$REPO_URL" "$TARGET_DIR"
      cd "$TARGET_DIR" || exit 1
    fi
  fi
}

generate_env_file() {
  log_info "Génération du fichier de configuration .env..."
  local tls_directive="tls internal"
  if [ "$CFG_TLS_TYPE" = "public" ]; then
    tls_directive=""
  fi

  local app_url="https://${CFG_DOMAIN}"
  if [ "$CFG_MODE" = "dev" ]; then
    app_url="http://localhost:3000"
  fi

  local db_url="postgresql://opensio:${CFG_DB_PASSWORD}@db:5432/opensio"
  if [ "$CFG_MODE" = "dev" ]; then
    db_url="postgresql://opensio:${CFG_DB_PASSWORD}@localhost:5432/opensio"
  fi

  if [ "$DRY_RUN" = "true" ]; then
    log_dry "Écriture du fichier .env avec APP_URL=${app_url}, AI_ENABLED=${CFG_AI_ENABLED}, DOMAIN=${CFG_DOMAIN}"
    return 0
  fi

  cat <<EOF > .env
# ==============================================================================
# OpenSIO — Configuration générée par l'installeur interactif
# ==============================================================================
NODE_ENV=${CFG_MODE}
APP_URL=${app_url}
API_PORT=${CFG_API_PORT}
HTTP_PORT=${CFG_HTTP_PORT}
HTTPS_PORT=${CFG_HTTPS_PORT}
DOMAIN=${CFG_DOMAIN}
TLS_DIRECTIVE=${tls_directive}

# Base de données PostgreSQL
DATABASE_URL=${db_url}
DB_PASSWORD=${CFG_DB_PASSWORD}

# Clés de sécurité & JWT
JWT_SECRET=${CFG_JWT_SECRET}
BACKUP_ENCRYPTION_KEY=${CFG_BACKUP_KEY}
REFRESH_TOKEN_TTL_DAYS=7
REGISTRATION_ENABLED=false

# Contenu & Labs
CONTENT_PATH=./content
LAB_RUNNER=simulation
LAB_SESSION_TTL_MINUTES=45
LAB_MAX_GLOBAL_VMS=2
TERMINAL_ENABLED=true

# Assistant IA (Mentor)
AI_ENABLED=${CFG_AI_ENABLED}
AI_PROVIDER=openai-compatible
AI_BASE_URL=${CFG_AI_URL}
AI_MODEL=${CFG_AI_MODEL}
AI_RATE_LIMIT_HOURLY=20
AI_TIMEOUT_MS=120000

# Sauvegardes
BACKUP_DIR=/backups
BACKUP_RETENTION_DAYS=7
BACKUP_CRON=0 2 * * *

# Données d'amorçage
SEED_MODE=${CFG_SEED_CHOICE}
EOF

  if [ "$CFG_MODE" = "dev" ] && [ -d "apps/api" ]; then
    cp .env apps/api/.env 2>/dev/null || true
  fi

  log_success "Fichier .env créé avec succès."
}

wait_for_service_health() {
  local service_name="$1" compose_file="$2" timeout="${3:-60}"
  log_info "Attente de l'état opérationnel du service '${service_name}'..."

  if [ "$DRY_RUN" = "true" ]; then
    log_dry "Attente santé '${service_name}' via docker compose"
    return 0
  fi

  local elapsed=0
  while [ "$elapsed" -lt "$timeout" ]; do
    local status
    status=$(docker compose -f "$compose_file" ps --format json "$service_name" 2>/dev/null | grep -oE '"Health":"[^"]+"' | cut -d'"' -f4 || echo "")
    if [ "$status" = "healthy" ]; then
      log_success "Service '${service_name}' prêt et sain !"
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
    echo -ne "${C_YELLOW}.${C_RESET}"
  done
  echo ""
  log_warn "Le service '${service_name}' n'a pas confirmé son statut de santé dans les ${timeout}s, continuation..."
}

execute_dev_stack() {
  log_info "Démarrage des conteneurs de développement (PostgreSQL)..."
  execute_cmd "Lancement Docker Compose Dev" docker compose -f infra/docker/docker-compose.dev.yml up -d

  log_info "Installation des dépendances du monorepo (pnpm)..."
  execute_cmd "Installation pnpm" pnpm install

  log_info "Application des migrations de base de données (Prisma)..."
  execute_cmd "Migrations Prisma" pnpm --filter @opensio/api exec prisma migrate deploy

  if [ "$CFG_SEED_CHOICE" != "aucun" ]; then
    log_info "Amorçage des données (Seed: ${CFG_SEED_CHOICE})..."
    if [ "$DRY_RUN" = "true" ]; then
      log_dry "SEED_MODE=${CFG_SEED_CHOICE} pnpm seed"
    else
      SEED_MODE="${CFG_SEED_CHOICE}" pnpm seed
    fi
  fi

  log_info "Synchronisation du contenu pédagogique..."
  execute_cmd "Synchronisation du contenu" pnpm content:sync

  print_dev_final_summary
}

execute_prod_stack() {
  local compose_cmd=(docker compose -f docker-compose.prod.yml)
  if [ "$CFG_COMPOSE_PROFILE" = "ai" ]; then
    compose_cmd+=(--profile ai)
  fi

  log_info "Démarrage de la stack de production durcie..."
  execute_cmd "Lancement de la stack Docker Compose" "${compose_cmd[@]}" up -d --build

  wait_for_service_health "db" "docker-compose.prod.yml" 60
  wait_for_service_health "api" "docker-compose.prod.yml" 90

  log_info "Application des migrations de schéma Prisma en conteneur..."
  execute_cmd "Migrations Prisma Prod" docker compose -f docker-compose.prod.yml exec -T api pnpm exec prisma migrate deploy

  if [ "$CFG_SEED_CHOICE" != "aucun" ]; then
    log_info "Amorçage initial de la base de données (Seed: ${CFG_SEED_CHOICE})..."
    execute_cmd "Seed Prod" docker compose -f docker-compose.prod.yml exec -T -e "SEED_MODE=${CFG_SEED_CHOICE}" api pnpm exec prisma db seed
  fi

  log_info "Synchronisation du référentiel pédagogique (D-02)..."
  execute_cmd "Synchronisation contenu Prod" docker compose -f docker-compose.prod.yml exec -T api pnpm --filter @opensio/api content:sync || true

  print_prod_final_summary
}

print_dev_final_summary() {
  echo -e "\n${C_GREEN}${C_BOLD}================================================================${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}  🎉 OpenSIO est prêt en Mode Développement !${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}================================================================${C_RESET}\n"
  echo -e "  🌐 Frontend Web : ${C_CYAN}http://localhost:3000${C_RESET}"
  echo -e "  🔌 API Backend  : ${C_CYAN}http://localhost:4000/api/v1${C_RESET}"
  if [ "$CFG_AI_ENABLED" = "true" ]; then
    echo -e "  🤖 Mentor IA    : ${C_GREEN}Activé (${CFG_AI_MODEL})${C_RESET}"
  else
    echo -e "  🤖 Mentor IA    : ${C_YELLOW}Désactivé${C_RESET}"
  fi
  if [ "$CFG_SEED_CHOICE" = "complet" ]; then
    echo -e "\n  🔑 Comptes de test :"
    echo -e "     - Admin   : ${C_CYAN}admin@opensio.local${C_RESET} (AdminOpenSIO2026!)"
    echo -e "     - Étudiant: ${C_CYAN}student@opensio.local${C_RESET} (StudentOpenSIO2026!)"
  elif [ "$CFG_SEED_CHOICE" = "minimal" ]; then
    echo -e "\n  🔑 Compte Administrateur : ${C_CYAN}admin@opensio.local${C_RESET} (AdminOpenSIO2026!)"
  fi
  echo -e "\n  🚀 Lancer la plateforme : ${C_CYAN}pnpm dev${C_RESET}\n"
}

print_prod_final_summary() {
  echo -e "\n${C_GREEN}${C_BOLD}================================================================${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}  🚀 OpenSIO est déployé en Mode Production !${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}================================================================${C_RESET}\n"
  echo -e "  🌐 URL d'accès HTTPS : ${C_CYAN}https://${CFG_DOMAIN}${C_RESET}"
  echo -e "  🔒 Reverse Proxy     : Caddy (${CFG_TLS_TYPE}) | Sauvegardes chiffrées : actives"
  if [ "$CFG_AI_ENABLED" = "true" ]; then
    echo -e "  🤖 Assistant IA      : ${C_GREEN}Activé (Modèle: ${CFG_AI_MODEL})${C_RESET}"
  else
    echo -e "  🤖 Assistant IA      : ${C_YELLOW}Désactivé${C_RESET}"
  fi
  if [ "$CFG_SEED_CHOICE" = "complet" ]; then
    echo -e "\n  🔑 Identifiants de connexion :"
    echo -e "     - Administrateur : ${C_CYAN}admin@opensio.local${C_RESET} (AdminOpenSIO2026!)"
    echo -e "     - Étudiant Démo  : ${C_CYAN}student@opensio.local${C_RESET} (StudentOpenSIO2026!)"
  elif [ "$CFG_SEED_CHOICE" = "minimal" ]; then
    echo -e "\n  🔑 Administrateur initial : ${C_CYAN}admin@opensio.local${C_RESET} (AdminOpenSIO2026!)"
  fi
  echo -e "\n  🛠 Commandes utiles :"
  echo -e "     - Consulter les journaux : ${C_CYAN}docker compose -f docker-compose.prod.yml logs -f${C_RESET}"
  echo -e "     - Sauvegarde manuelle    : ${C_CYAN}docker compose -f docker-compose.prod.yml exec backup /scripts/backup.sh${C_RESET}\n"
}

run_phase_execute() {
  echo -e "\n${C_BOLD}${C_CYAN}=== PHASE 3 / 3 : EXÉCUTION EN UNE PASSE ===${C_RESET}\n"
  prepare_repository
  generate_env_file
  if [ "$CFG_MODE" = "dev" ]; then
    execute_dev_stack
  else
    execute_prod_stack
  fi
}
