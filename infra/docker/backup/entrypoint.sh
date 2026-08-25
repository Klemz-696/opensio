#!/bin/sh
set -eu

echo "📦 [OpenSIO Backup Service] Démarrage du service de sauvegarde PostgreSQL 18..."

# Exécution d'une première sauvegarde immédiate au démarrage si demandé
if [ "${BACKUP_ON_START:-false}" = "true" ]; then
  echo "🚀 [OpenSIO Backup Service] Sauvegarde initiale au démarrage..."
  /scripts/backup.sh || echo "⚠️ Sauvegarde initiale échouée (la base démarre peut-être encore)"
fi

# Configuration de la tâche cron quotidienne (défaut : 2h du matin)
CRON_SCHEDULE="${BACKUP_CRON:-0 2 * * *}"
echo "${CRON_SCHEDULE} /scripts/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

echo "⏰ [OpenSIO Backup Service] Planificateur cron configuré (${CRON_SCHEDULE})."
exec crond -f -l 2
