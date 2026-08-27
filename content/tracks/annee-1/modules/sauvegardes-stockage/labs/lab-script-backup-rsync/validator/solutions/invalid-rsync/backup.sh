#!/bin/bash
set -e

SOURCE_DIR="/srv/data"
BACKUP_DIR="/backup/archives"
LOG_FILE="/var/log/backup.log"

# Erreur : utilisation de cp sans rsync ni delete ni exclusions
cp -r "${SOURCE_DIR}" "${BACKUP_DIR}"

sha256sum "${BACKUP_DIR}/archive.tar.gz" >> "${BACKUP_DIR}/checksums.sha256"
find "${BACKUP_DIR}" -type f -mtime +7 -delete
