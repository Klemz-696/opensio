#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Script de Restauration de Sauvegarde Chiffrée PostgreSQL 18
# ==============================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"
PGHOST="${PGHOST:-db}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-opensio}"
PGDATABASE="${PGDATABASE:-opensio}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-${JWT_SECRET:-}}"

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: $0 <chemin_du_fichier_de_sauvegarde.sql.gz.enc>" >&2
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "❌ [ERREUR] Le fichier de sauvegarde introuvable : ${BACKUP_FILE}" >&2
  exit 1
fi

if [[ -z "${BACKUP_ENCRYPTION_KEY}" ]]; then
  echo "❌ [ERREUR] BACKUP_ENCRYPTION_KEY ou JWT_SECRET est requis pour déchiffrer la sauvegarde." >&2
  exit 1
fi

# Vérification de l'empreinte SHA256 si présente
if [[ -f "${BACKUP_FILE}.sha256" ]]; then
  echo "🔍 [OpenSIO Restore] Vérification de l'intégrité SHA256..."
  sha256sum -c "${BACKUP_FILE}.sha256" || {
    echo "❌ [ERREUR] L'empreinte SHA256 ne correspond pas. Archive altérée ou corrompue !" >&2
    exit 1
  }
  echo "✅ [OpenSIO Restore] Intégrité validée."
fi

echo "🔄 [OpenSIO Restore] Déchiffrement, décompression et restauration de '${BACKUP_FILE}' vers ${PGHOST}:${PGPORT}/${PGDATABASE}..."

# Déchiffrement AES-256-CBC -> Décompression gunzip -> Restauration psql
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass "pass:${BACKUP_ENCRYPTION_KEY}" -in "${BACKUP_FILE}" \
  | gzip -dc \
  | psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}"

echo "✅ [OpenSIO Restore] Base de données restaurée avec succès."
