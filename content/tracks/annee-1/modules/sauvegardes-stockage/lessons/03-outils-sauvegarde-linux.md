---
slug: outils-sauvegarde-linux
title: "Outils de sauvegarde sous Linux : rsync, BorgBackup, Restic et automatisation (Cron/Timers)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Maîtriser la synchronisation et la sauvegarde incrémentale de fichiers avec l'utilitaire rsync"
  - "Utiliser les hard links (--link-dest) pour créer des sauvegardes snapshot légères avec rsync"
  - "Découvrir les solutions modernes dédupliquées et chiffrées : BorgBackup et Restic"
  - "Automatiser l'exécution périodique des tâches de sauvegarde avec Cron (/etc/cron.d/) et les Timers systemd"
  - "Gérer la rotation des archives et le contrôle d'intégrité par empreinte cryptographique SHA-256"
prerequisites:
  - "linux-administration"
  - "strategie-sauvegarde-3-2-1"
competency_refs:
  - "B1.1"
  - "B2.3"
  - "B3.4"
success_criteria:
  - "Réussir le quiz 'Outils de Sauvegarde Linux' avec au moins 80 %"
  - "Valider l'atelier 'Script de Sauvegarde Automatisée avec rsync et Contrôle SHA-256'"
labs:
  - slug: script-sauvegarde-rsync-rotation
    required: true
references:
  - label: "BorgBackup Documentation — Deduplicating Archiver"
    url: "https://borgbackup.readthedocs.io/en/stable/"
  - label: "rsync(1) manual page — Remote Sync Tool"
    url: "https://man7.org/linux/man-pages/man1/rsync.1.html"
---

# Outils de Sauvegarde sous Linux : rsync, BorgBackup et Automatisation

L'écosystème Linux dispose d'outils puissants, natifs ou spécialisés, permettant d'automatiser la sauvegarde des fichiers, bases de données et configurations systèmes.

---

## 1. L'Utilitaire Incontournable : `rsync`

**`rsync`** (_Remote Sync_) est l'outil standard de synchronisation unidirectionnelle de fichiers et dossiers sous UNIX/Linux. Grâce à son algorithme de transfert différentiel, il n'envoie sur le réseau que les octets modifiés à l'intérieur des fichiers existants.

### 1.1. Syntaxe et Options Essentielles
```bash
rsync [OPTIONS] SOURCE DESTINATION
```

| Option | Signification & Rôle |
|---|---|
| `-a` (`--archive`) | Mode archive : préserve récursivement les permissions (`-p`), propriétaires (`-o`), groupes (`-g`), dates de modification (`-t`), liens symboliques (`-l`) et périphériques (`-D`). |
| `-v` (`--verbose`) | Mode verbeux affichant le détail des fichiers transférés. |
| `-z` (`--compress`) | Compresse les données à la volée pendant le transit réseau. |
| `-h` (`--human-readable`) | Affiche les tailles en Ko, Mo ou Go lisibles. |
| `--delete` | **Supprime sur la destination** les fichiers qui n'existent plus dans la source (miroir strict). |
| `--exclude=MOTIF` | Exclut des fichiers ou dossiers temporaires (ex: `--exclude="*.tmp"`). |
| `-e ssh` | Chiffre le tunnel de transfert via SSH avec authentification par clé publique. |

> [!CAUTION]
> **Attention au slash final `/` sous rsync !**
> - `rsync -av /var/www /backup/` : Crée le sous-dossier `/backup/www/`.
> - `rsync -av /var/www/ /backup/` : Copie **le contenu** de `/var/www/` directement à la racine de `/backup/`.

### 1.2. Sauvegardes Horodatées avec Liens Physiques (`--link-dest`)
L'option `--link-dest` permet de créer des sauvegardes incrémentales complètes en apparence, mais ne consommant que l'espace des nouveaux fichiers modifiés grâce aux _Hard Links_ du système de fichiers :

```bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
rsync -av --delete \
  --link-dest=/backup/latest \
  /data/partages/ \
  /backup/backup-${DATE}

# Mettre à jour le lien symbolique vers la dernière sauvegarde
rm -f /backup/latest
ln -s /backup/backup-${DATE} /backup/latest
```

---

## 2. Solutions Modernes Dédupliquées : BorgBackup

Bien que `rsync` soit excellent pour de la copie miroir, des solutions comme **BorgBackup** offrent nativement la déduplication au bloc, la compression ZSTD et le chiffrement authentifié AES-256 :

```bash
# 1. Initialiser un dépôt Borg sécurisé et chiffré
borg init --encryption=repokey-blake2 /backup/mon-depot.borg

# 2. Créer une archive horodatée (avec déduplication automatique)
borg create --stats --progress --compression zstd \
  /backup/mon-depot.borg::srv-prod-$(date +%Y-%m-%d) \
  /etc /var/www /home /data

# 3. Lister les archives disponibles dans le dépôt
borg list /backup/mon-depot.borg

# 4. Appliquer une politique de rétention automatique (7 jours, 4 semaines, 12 mois)
borg prune --keep-daily=7 --keep-weekly=4 --keep-monthly=12 /backup/mon-depot.borg
```

---

## 3. Automatisation des Tâches : Cron et Timers Systemd

### 3.1. Automatisation par Crontab Système (`/etc/cron.d/`)
Les tâches d'administration automatisées sont consignées dans `/etc/cron.d/` ou via `crontab -e` :

```text
# Structure : Minute (0-59) Heure (0-23) JourDuMois (1-31) Mois (1-12) JourSemaine (0-7) Utilisateur Commande
# Exécuter la sauvegarde chaque nuit à 02h30 du matin
30 02 * * * root /usr/local/bin/backup-production.sh >> /var/log/backup.log 2>&1
```

### 3.2. Automatisation moderne avec Timers Systemd
Préférés en entreprise car ils offrent une journalisation unifiée dans `journalctl`, une gestion des dépendances et un suivi précis des échecs :

Fichier `/etc/systemd/system/backup.timer` :
```ini
[Unit]
Description=Timer de sauvegarde quotidienne OpenSIO
After=network-online.target

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

---

## 4. Contrôle d'Intégrité des Sauvegardes par Empreinte SHA-256

Pour garantir qu'une archive n'a pas été altérée lors du transfert ou corrompue par un disque défaillant :

```bash
# Générer le fichier d'empreintes SHA-256
sha256sum backup-2026-08-27.tar.gz > backup-2026-08-27.sha256

# Vérifier l'intégrité avant restauration
sha256sum -c backup-2026-08-27.sha256
# (Retourne 'backup-2026-08-27.tar.gz: OK' si l'intégrité est parfaite)
```
