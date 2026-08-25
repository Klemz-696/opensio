#!/usr/bin/env bash
# ==============================================================================
# OpenSIO — Script de Sauvegarde Chiffrée PostgreSQL 18 (D-18)
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
PGHOST="${PGHOST:-db}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-opensio}"
PGDATABASE="${PGDATABASE:-opensio}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-${JWT_SECRET:-}}"

if [[ -z "${BACKUP_ENCRYPTION_KEY}" ]]; then
  echo "❌ [ERREUR] BACKUP_ENCRYPTION_KEY ou JWT_SECRET est requis pour chiffrer la sauvegarde." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="opensio_backup_${TIMESTAMP}.sql.gz.enc"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

echo "📦 [OpenSIO Backup] Démarrage de la sauvegarde de la base '${PGDATABASE}' sur ${PGHOST}:${PGPORT}..."

# Export pg_dump 18 -> compression gzip -> chiffrement AES-256-CBC PBKDF2
pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" "${PGDATABASE}" \
  | gzip -c \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -pass "pass:${BACKUP_ENCRYPTION_KEY}" -out "${BACKUP_PATH}"

# Empreinte SHA256 pour vérification d'intégrité
sha256sum "${BACKUP_PATH}" > "${BACKUP_PATH}.sha256"

FILE_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
echo "✅ [OpenSIO Backup] Sauvegarde réussie : ${BACKUP_FILENAME} (${FILE_SIZE})"

# Rotation des sauvegardes : suppression des fichiers de plus de N jours
echo "🧹 [OpenSIO Backup] Nettoyage des sauvegardes de plus de ${BACKUP_RETENTION_DAYS} jours..."
find "${BACKUP_DIR}" -name "opensio_backup_*.sql.gz.enc*" -mtime "+${BACKUP_RETENTION_DAYS}" -type f -delete 2>/dev/null || true

echo "✨ [OpenSIO Backup] Opération terminée."
