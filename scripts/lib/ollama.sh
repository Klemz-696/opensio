#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Module Ollama & Sondage IA (lib/ollama.sh)
# Détection locale, sondage API distante (/api/tags), pull de modèles
# ==============================================================================

export OLLAMA_LOCAL_FOUND=false
export OLLAMA_LOCAL_MODEL_PRESENT=false

# Détecte une installation locale d'Ollama sur l'hôte
detect_local_ollama() {
  local target_model="${1:-llama3.1:8b}"
  log_info "Recherche d'une instance Ollama locale sur l'hôte..."
  OLLAMA_LOCAL_FOUND=false
  OLLAMA_LOCAL_MODEL_PRESENT=false

  if command -v ollama &>/dev/null; then
    OLLAMA_LOCAL_FOUND=true
    if ollama list 2>/dev/null | grep -q "$target_model"; then
      OLLAMA_LOCAL_MODEL_PRESENT=true
      log_success "Ollama local détecté avec le modèle '${target_model}'."
    else
      log_warn "Ollama local est présent mais le modèle '${target_model}' n'est pas encore téléchargé."
    fi
  else
    log_info "Aucun binaire Ollama détecté sur l'hôte."
  fi
}

# Normalise une URL Ollama pour retirer /v1 si présent lors des requêtes d'administration
clean_ollama_base_url() {
  local url="$1"
  url="${url%/}"
  url="${url%/v1}"
  echo "$url"
}

# Teste la connexion à une instance Ollama distante et la présence du modèle
probe_remote_ollama() {
  local raw_url="$1"
  local target_model="${2:-llama3.1:8b}"
  local base_url
  base_url=$(clean_ollama_base_url "$raw_url")

  log_info "Test de connectivité vers le nœud Ollama distant (${base_url})..."

  local tags_response
  if ! tags_response=$(curl -fsS -m 5 "${base_url}/api/tags" 2>/dev/null); then
    log_error "Impossible de joindre l'API Ollama à l'adresse : ${base_url}/api/tags"
    echo -e "   ${C_CYAN}--> Vérifiez que Ollama écoute bien sur 0.0.0.0 (OLLAMA_HOST=0.0.0.0)${C_RESET}"
    echo -e "   ${C_CYAN}--> Vérifiez les règles de pare-feu (UFW) sur la machine distante.${C_RESET}"
    return 1
  fi

  log_success "Connexion établie avec succès avec le nœud Ollama distant !"

  # Vérification de la présence du modèle dans la réponse JSON
  if echo "$tags_response" | grep -q "\"name\":\"${target_model}"; then
    log_success "Modèle '${target_model}' disponible sur le serveur distant."
    return 0
  else
    log_warn "Le modèle '${target_model}' n'est pas présent sur le serveur distant."
    if ask_confirm "Lancer le téléchargement de '${target_model}' sur le nœud distant ?" "Y"; then
      log_info "Envoi de la requête de téléchargement (POST ${base_url}/api/pull)..."
      if [ "$DRY_RUN" = "true" ]; then
        log_dry "curl -sS -X POST \"${base_url}/api/pull\" -d '{\"name\":\"${target_model}\"}'"
        return 0
      fi
      if curl -sS -X POST "${base_url}/api/pull" -d "{\"name\":\"${target_model}\"}" 2>&1 | grep -q "success"; then
        log_success "Modèle '${target_model}' téléchargé avec succès sur le serveur distant."
        return 0
      else
        log_warn "Le téléchargement distant a été initié en arrière-plan ou a renvoyé un statut partiel."
        return 0
      fi
    fi
  fi
  return 0
}
