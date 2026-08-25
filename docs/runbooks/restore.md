# Runbook — Procédure de Restauration de Base de Données (D-18)

Ce document décrit la procédure opérationnelle standard (SOP) pour restaurer une sauvegarde chiffrée de la base de données PostgreSQL 18 d'OpenSIO.

---

## 1. Contexte & Principes de Sauvegarde (D-18)

- **Format des sauvegardes** : `opensio_backup_YYYYMMDD_HHMMSS.sql.gz.enc`
- **Algorithme de chiffrement** : AES-256-CBC avec PBKDF2 (100 000 itérations)
- **Vérification d'intégrité** : Fichier `.sha256` généré à chaque sauvegarde
- **Rétention** : 7 jours glissants
- **Emplacement par défaut** : Volume Docker `backups_data` (`/backups`)

---

## 2. Procédure de Restauration en Production

### Étape 1 — Identifier l'archive de sauvegarde à restaurer

Listez les sauvegardes disponibles dans le conteneur :

```bash
docker compose -f docker-compose.prod.yml exec backup ls -la /backups
```

Exemple de sortie :
```text
-rw-r--r-- 1 root root  45218 Aug 25 02:00 opensio_backup_20260825_020000.sql.gz.enc
-rw-r--r-- 1 root root    120 Aug 25 02:00 opensio_backup_20260825_020000.sql.gz.enc.sha256
```

### Étape 2 — Arrêter les services applicatifs (optionnel mais recommandé)

Pour éviter les écritures concurrentes pendant la restauration :

```bash
docker compose -f docker-compose.prod.yml stop web api
```

### Étape 3 — Exécuter la restauration via le script dédié

Lancez la restauration depuis le conteneur de backup :

```bash
docker compose -f docker-compose.prod.yml exec backup /scripts/restore.sh /backups/opensio_backup_20260825_020000.sql.gz.enc
```

Le script effectue automatiquement :
1. La vérification de l'empreinte SHA256 pour détecter toute corruption.
2. Le déchiffrement à la volée via la clé `BACKUP_ENCRYPTION_KEY`.
3. La décompression et l'injection dans PostgreSQL 18 (`db:5432`).

### Étape 4 — Redémarrer et valider les services

```bash
# Redémarrage de l'API et du Web
docker compose -f docker-compose.prod.yml start api web

# Vérification du Health Check
curl -k https://opensio.home.lan/api/v1/health
# ou en local :
docker compose -f docker-compose.prod.yml exec api wget -qO- http://127.0.0.1:4000/api/v1/health
```

---

## 3. Procédure de Restauration d'Urgence (Disaster Recovery)

En cas de perte totale du serveur ou de migration sur un nouveau matériel :

1. Déployez un nouvel hôte Debian 12 avec Docker.
2. Clonez le dépôt et configurez votre fichier `.env` avec le même `JWT_SECRET` (qui sert de clé de déchiffrement).
3. Transférez votre archive `.sql.gz.enc` et son `.sha256` dans le répertoire des sauvegardes.
4. Lancez la base de données :
   ```bash
   docker compose -f docker-compose.prod.yml up -d db backup
   ```
5. Copiez l'archive dans le volume de backup et restaurez :
   ```bash
   docker cp ./opensio_backup_*.sql.gz.enc opensio-backup:/backups/
   docker compose -f docker-compose.prod.yml exec backup /scripts/restore.sh /backups/opensio_backup_*.sql.gz.enc
   ```
6. Lancez le reste de la stack :
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## 4. Validation & Test Périodique de Restauration

Conformément à la convention **D-18**, cette procédure doit être testée au moins une fois par jalon.

Commande de test unitaire rapide :
```bash
# Déclenche une sauvegarde
docker compose -f docker-compose.prod.yml exec backup /scripts/backup.sh

# Restaure immédiatement la dernière sauvegarde
LATEST_BACKUP=$(docker compose -f docker-compose.prod.yml exec backup sh -c "ls -t /backups/*.sql.gz.enc | head -n 1")
docker compose -f docker-compose.prod.yml exec backup /scripts/restore.sh "$LATEST_BACKUP"
```
