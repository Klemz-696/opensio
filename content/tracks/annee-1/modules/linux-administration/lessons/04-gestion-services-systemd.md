---
slug: gestion-services-systemd
title: "Gestion des services, des démons et de l'initialisation avec Systemd"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Comprendre l'architecture de systemd (PID 1) et le concept d'unités (.service, .target, .timer, .socket)"
  - "Contrôler le cycle de vie des services avec systemctl (start, stop, restart, reload, status)"
  - "Gérer l'activation au démarrage du système (enable, disable, mask)"
  - "Rédiger et personnaliser une unité de service systemd personnalisée"
  - "Diagnostiquer un échec de service et analyser les dépendances"
prerequisites:
  - "paquets-et-logiciels-apt"
competency_refs:
  - "B1.2"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Gestion des Services Systemd' avec au moins 80 %"
  - "Valider l'atelier 'Dépannage d'un Service Systemd'"
labs:
  - slug: depannage-service-systemd
    required: true
references:
  - label: "Documentation Freedesktop — Man-page systemd.service(5)"
    url: "https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html"
  - label: "Documentation Debian — Systemd pour les administrateurs"
    url: "https://wiki.debian.org/fr/systemd"
---

# Gestion des Services, des Démons et de l'Initialisation avec Systemd

**Systemd** est le système d'initialisation et le gestionnaire de services standard sous Linux. Il s'exécute avec le **PID 1**, orchestre le démarrage parallèle des composants système et supervise l'état des démons tout au long du fonctionnement du serveur.

---

## 1. Concepts Clés : Les Unités Systemd

Systemd gère des **unités** (_units_) identifiées par leur suffixe :

| Type d'unité | Rôle & Description |
|---|---|
| `.service` | Démon ou service applicatif en arrière-plan (ex: `nginx.service`, `ssh.service`) |
| `.target` | Groupe logique d'unités représentant un état d'exécution (similaire aux anciens Runlevels SysVinit) |
| `.timer` | Minuteur géré par systemd pour remplacer ou compléter les tâches cron périodiques |
| `.socket` | Socket réseau ou IPC géré par systemd avec activation à la demande (_Socket Activation_) |
| `.mount` & `.automount` | Points de montage de systèmes de fichiers |

### Les cibles courantes (`.target`) :
- `multi-user.target` : Mode serveur multi-utilisateurs en ligne de commande (équivalent Runlevel 3).
- `graphical.target` : Mode avec interface graphique utilisateur (équivalent Runlevel 5).
- `rescue.target` & `emergency.target` : Modes de maintenance et de secours mono-utilisateur.

---

## 2. Commandes de Contrôle des Services avec `systemctl`

```bash
# 1. Consulter l'état détaillé d'un service (statut, PID, mémoire, logs récents)
systemctl status isc-dhcp-server

# 2. Démarrer, arrêter ou redémarrer un service
systemctl start nginx
systemctl stop nginx
systemctl restart nginx

# 3. Recharger la configuration d'un service à chaud sans couper les connexions actives
systemctl reload nginx

# 4. Activer ou désactiver le lancement automatique d'un service au démarrage de la machine
systemctl enable bind9
systemctl disable bind9

# 5. Démarrer ET activer en une seule commande
systemctl enable --now bind9

# 6. Masquer un service (interdit tout démarrage manuel ou par dépendance)
systemctl mask telnet.service
systemctl unmask telnet.service

# 7. Vérifier si un service est actif ou activé au démarrage
systemctl is-active ssh
systemctl is-enabled ssh

# 8. Recharger la configuration de systemd après avoir modifié un fichier d'unité
systemctl daemon-reload
```

---

## 3. Structure d'un Fichier d'Unité de Service (`.service`)

Les fichiers d'unités personnalisés doivent être placés dans `/etc/systemd/system/` (prioritaires sur les fichiers par défaut de `/lib/systemd/system/`).

Un fichier `.service` comprend 3 sections indispensables :

```ini
[Unit]
Description=Mon API Backend Node.js de Production
Documentation=https://docs.entreprise.lan/api
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/opt/mon-app
ExecStart=/usr/bin/node /opt/mon-app/dist/main.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5s
Environment=NODE_ENV=production
EnvironmentFile=/opt/mon-app/.env

# Sécurité & Durcissement
ProtectSystem=full
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Explications des directives clés :
- `After=` : Définit l'ordre de démarrage (démarre après le réseau et la base de données).
- `Requires=` / `Wants=` : `Requires` impose la présence obligatoire de l'autre unité ; `Wants` exprime une dépendance non bloquante.
- `Type=` : `simple` (processus standard ne faisant pas de fork), `forking` (démon traditionnel), `oneshot` (script d'exécution ponctuelle).
- `Restart=always` : Relance automatiquement le service en cas de crash.

---

## 4. Dépannage et Analyse d'un Service en Échec

Lorsqu'un service passe à l'état `failed`, appliquez la démarche méthodique suivante :

1. **Examinez le statut détaillé** :
   ```bash
   systemctl status nom-service.service
   ```
2. **Consultez les journaux récents du service avec journalctl** :
   ```bash
   journalctl -u nom-service.service -e -n 50 --no-pager
   ```
3. **Vérifiez la syntaxe du fichier de configuration applicatif** (ex: `nginx -t` pour Nginx, `named-checkconf` pour Bind9).
4. **Vérifiez la disponibilité des ports et adresses d'écoute** :
   ```bash
   ss -tulpen | grep :80
   ```
5. **Rechargez la configuration de systemd** après correction :
   ```bash
   systemctl daemon-reload && systemctl restart nom-service.service
   ```
