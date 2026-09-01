---
slug: analyse-journaux-et-processus
title: "Supervision des processus, analyse des ressources et exploitation des journaux (journalctl, rsyslog)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Surveiller les processus actifs, l'usage mémoire et CPU (ps, top, htop, free, vmstat)"
  - "Gérer le cycle de vie des processus et les signaux POSIX (kill, pkill, SIGTERM, SIGKILL, SIGHUP)"
  - "Comprendre l'architecture de journalisation Linux : journald (binaire) et rsyslog (texte)"
  - "Exploiter journalctl avec des filtres précis (unité, sévérité, période temporelle, suivi en direct)"
  - "Configurer la rotation et la compression des journaux d'application avec logrotate"
prerequisites:
  - "gestion-services-systemd"
competency_refs:
  - "B1.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Analyse des Journaux et Processus' avec au moins 80 %"
labs: []
references:
  - label: "Documentation Freedesktop — Man-page journalctl(1)"
    url: "https://www.freedesktop.org/software/systemd/man/latest/journalctl.html"
  - label: "Documentation Debian — Gestion des logs et logrotate"
    url: "https://wiki.debian.org/fr/Logrotate"
---

# Supervision des Processus, Analyse des Ressources et Journaux

L'exploitation quotidienne d'un serveur d'infrastructure repose sur deux compétences essentielles : la maîtrise de la consommation des ressources (CPU, RAM, Disque, Processus) et l'analyse méthodique des journaux système pour identifier les anomalies et les tentatives d'intrusion.

---

## 1. Gestion des Processus et Métriques Système

Chaque programme en cours d'exécution correspond à un **processus** identifié par un **PID** (_Process ID_).

### 1.1. Commandes de surveillance des processus
```bash
# 1. Lister tous les processus en cours avec hiérarchie et utilisateurs
ps aux
ps -ef --forest

# 2. Visualisation dynamique et interactive des processus
top
htop

# 3. Consulter l'utilisation de la mémoire vive (RAM) et du Swap en Mo/Go
free -h

# 4. Consulter l'espace disque disponible sur les systèmes de fichiers montés
df -hT

# 5. Mesurer la taille d'un dossier et de ses sous-répertoires
du -sh /var/log/*

# 6. Analyser les statistiques d'E/S disque et de mémoire virtuelle
vmstat 2 5
```

### 1.2. Signaux POSIX et interruption de processus
Pour communiquer avec un processus ou lui demander de s'arrêter, l'administrateur lui envoie un **signal** :

| Signal | Numéro | Nom | Effet |
|---|:---:|---|---|
| **SIGTERM** | 15 | Terminaison propre | Demande au processus de sauvegarder son état et de fermer ses descripteurs proprement (signal par défaut de `kill`). |
| **SIGKILL** | 9 | Arrêt forcé immédiat | Détruit immédiatement le processus au niveau du noyau (à utiliser uniquement si SIGTERM ne répond pas). |
| **SIGHUP** | 1 | Rechargement | Indique au démon de relire ses fichiers de configuration sans s'arrêter. |

```bash
# Envoyer un signal de terminaison propre au PID 1245
kill 1245

# Forcer l'arrêt immédiat d'un processus récalcitrant
kill -9 1245

# Arrêter tous les processus liés à un nom de programme
pkill -u www-data nginx
```

---

## 2. Architecture des Journaux : `systemd-journald` & `rsyslog`

Debian combine deux systèmes complémentaires :
- **`systemd-journald`** : Collecte centralisée de tous les événements au format binaire structuré et indexé.
- **`rsyslog`** : Moteur de tri traditionnel écrivant les logs texte sous `/var/log/` (`syslog`, `auth.log`, `daemon.log`, `mail.log`).

### Les 8 niveaux de sévérité Syslog (RFC 5424) :
```text
0 : Emergency (Système inutilisable)
1 : Alert     (Action immédiate requise)
2 : Critical  (Condition critique)
3 : Error     (Erreur d'exécution)
4 : Warning   (Avertissement)
5 : Notice    (Événement normal mais significatif)
6 : Info      (Message informatif)
7 : Debug     (Messages de débogage technique)
```

---

## 3. Requêtes Efficaces avec `journalctl`

`journalctl` permet d'extraire rapidement les événements précis sans avoir à parser manuellement des dizaines de fichiers texte :

```bash
# 1. Afficher les logs d'une unité de service spécifique
journalctl -u nginx.service

# 2. Suivre les logs en temps réel (équivalent tail -f)
journalctl -u nginx.service -f

# 3. Afficher uniquement les 50 dernières entrées sans pagination
journalctl -u bind9.service -n 50 --no-pager

# 4. Filtrer par niveau de sévérité (ex: erreurs et plus grave : emerg, alert, crit, err)
journalctl -p err..emerg

# 5. Filtrer par plage temporelle
journalctl --since "2026-08-27 08:00:00" --until "2026-08-27 12:00:00"
journalctl --since "1 hour ago"

# 6. Afficher les logs du démarrage courant de la machine uniquement
journalctl -b

# 7. Afficher les échecs d'authentification SSH (détection brute-force)
journalctl -u ssh.service | grep -i "failed password"
```

---

## 4. Politique de Rotation des Journaux avec `logrotate`

Pour éviter la saturation de l'espace disque, l'utilitaire `logrotate` compresse et archive périodiquement les journaux textuels.

Exemple de configuration `/etc/logrotate.d/nginx` :
```text
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```
- `daily` : Rotation quotidienne.
- `rotate 14` : Rétention des 14 dernières archives.
- `compress` : Compression gzip (`.gz`) des anciennes archives.
- `create 0640 www-data adm` : Recréation du fichier actif avec permissions durcies.
