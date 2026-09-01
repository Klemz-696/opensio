#!/bin/bash
set -euo pipefail

SOURCE_DIR="/srv/data"
BACKUP_DIR="/backup/archives"
LOG_FILE="/var/log/backup.log"

rsync -avz --delete --exclude="*.tmp" "${SOURCE_DIR}/" "${BACKUP_DIR}/" >> "${LOG_FILE}"

# Erreur : absence de calcul sha256sum
echo "Sauvegarde terminée sans hash" >> "${LOG_FILE}"

find "${BACKUP_DIR}" -type f -mtime +7 -delete
exit 0
