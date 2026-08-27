#!/bin/bash
# Script de Sauvegarde Automatisée OpenSIO avec rsync, rotation et SHA-256
set -euo pipefail

# Configuration
SOURCE_DIR="/srv/data"
BACKUP_DIR="/backup/archives"
LOG_FILE="/var/log/backup.log"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
TARGET_ARCHIVE="${BACKUP_DIR}/backup_${DATE}.tar.gz"
CHECKSUM_FILE="${BACKUP_DIR}/checksums.sha256"

# Initialisation
mkdir -p "${BACKUP_DIR}" "$(dirname "${LOG_FILE}")"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] === Démarrage de la sauvegarde ===" >> "${LOG_FILE}"

# 1. Synchronisation miroir avec exclusion des fichiers temporaires
TEMP_SYNC="${BACKUP_DIR}/sync_latest"
mkdir -p "${TEMP_SYNC}"

rsync -avz --delete \
  --exclude="*.tmp" \
  --exclude="*.cache" \
  --exclude="~*" \
  "${SOURCE_DIR}/" "${TEMP_SYNC}/" >> "${LOG_FILE}" 2>&1

# 2. Création de l'archive compressée
tar -czf "${TARGET_ARCHIVE}" -C "${TEMP_SYNC}" . >> "${LOG_FILE}" 2>&1

# 3. Calcul et enregistrement de l'empreinte SHA-256
sha256sum "${TARGET_ARCHIVE}" >> "${CHECKSUM_FILE}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Empreinte SHA-256 calculée avec succès" >> "${LOG_FILE}"

# 4. Rotation et purge des sauvegardes de plus de 7 jours
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Nettoyage des sauvegardes antérieures à ${RETENTION_DAYS} jours..." >> "${LOG_FILE}"
find "${BACKUP_DIR}" -type f -name "backup_*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] === Sauvegarde terminée avec succès ===" >> "${LOG_FILE}"
exit 0
