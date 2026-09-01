#!/bin/bash
set -euo pipefail

SOURCE_DIR="/srv/data"
BACKUP_DIR="/backup/archives"
LOG_FILE="/var/log/backup.log"

rsync -avz --delete --exclude="*.tmp" "${SOURCE_DIR}/" "${BACKUP_DIR}/" >> "${LOG_FILE}"
sha256sum "${BACKUP_DIR}/backup.tar.gz" >> "${BACKUP_DIR}/checksums.sha256"

# Erreur : absence de commande find / rotation de rétention
echo "Fin de script sans purge"
exit 0
