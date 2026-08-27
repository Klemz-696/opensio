---
slug: volumes-stockage-et-persistance
title: "Volumes, Stockage Persistant et Stratégies de Sauvegarde Docker"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 50
objectives:
  - "Comprendre la nature éphémère du stockage conteneurisé par défaut"
  - "Comparer les 3 modes de persistance : Volumes nommés, Bind Mounts et tmpfs"
  - "Créer et attacher des volumes nommés pour les bases de données d'entreprise"
  - "Monter des fichiers de configuration en lecture seule (:ro) via Bind Mounts"
  - "Sauvegarder et restaurer des volumes Docker via des conteneurs temporaires"
prerequisites:
  - "linux-administration"
  - "principes-conteneurisation-et-cycle-vie"
competency_refs:
  - "B2.3"
  - "B1.1"
success_criteria:
  - "Réussir le quiz 'Volumes et Persistance' avec au moins 80 %"
labs: []
references:
  - label: "Docker Volumes Official Documentation"
    url: "https://docs.docker.com/storage/volumes/"
  - label: "Manage data in Docker"
    url: "https://docs.docker.com/storage/"
---

# Volumes, Stockage Persistant et Stratégies de Sauvegarde Docker

Par défaut, toutes les données créées à l'intérieur d'un conteneur sont stockées dans sa couche d'écriture temporaire (*Writable Layer*). Si le conteneur est supprimé (`docker rm`), **toutes ses données sont irrémédiablement perdues**.

---

## 1. Les 3 Types de Stockage Persistant sous Docker

```text
┌─────────────────────────────────────────────────────────────┐
│                 Hôte Docker (Système de fichiers)           │
│                                                             │
│   /var/lib/docker/volumes/      /home/admin/app/conf/     [ Mémoire RAM ]
│   ┌──────────────────────┐      ┌──────────────────┐      ┌─────────────┐
│   │    Volume Nommé      │      │    Bind Mount    │      │    tmpfs    │
│   │   (Géré par Docker)  │      │   (Chemin Hôte)  │      │ (Volatile)  │
│   └──────────┬───────────┘      └────────┬─────────┘      └──────┬──────┘
└──────────────┼───────────────────────────┼───────────────────────┼───┘
               │                           │                       │
               ▼                           ▼                       ▼
    /var/lib/postgresql/data       /etc/nginx/nginx.conf         /tmp/cache
   ┌───────────────────────────────────────────────────────────────────┐
   │                        Conteneur Docker                           │
   └───────────────────────────────────────────────────────────────────┘
```

| Type de Montage | Emplacement | Caractéristiques & Usages Recommandés |
|---|---|---|
| **Volume Nommé (_Named Volume_)** | `/var/lib/docker/volumes/` | **Recommandé en production** pour les bases de données (PostgreSQL, MySQL). Isolé, haute performance, géré nativement par l'API Docker. |
| **Montage Lié (_Bind Mount_)** | Tout chemin arbitraire de l'hôte (ex: `/etc/ssl/`) | Idéal pour injecter des configurations en lecture seule (`:ro`) ou pour le développement (rechargement à chaud du code source). |
| **Montage en Mémoire (_tmpfs_)** | Mémoire vive (RAM) | Données volatiles ou hautement confidentielles (clés de session) qui ne doivent jamais toucher le disque dur. |

---

## 2. Manipulation des Volumes Nommés

```bash
# 1. Création d'un volume persistant
docker volume create postgres_data

# 2. Association au conteneur de base de données
docker run -d \
  --name db-prod \
  -v postgres_data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16-alpine

# 3. Lister et inspecter les volumes
docker volume ls
docker volume inspect postgres_data
```

---

## 3. Sauvegarde et Restauration d'un Volume

Puisque les volumes sont gérés par le démon Docker, la méthode standard pour sauvegarder un volume consiste à lancer un **conteneur utilitaire éphémère** (`alpine`) :

### 1. Sauvegarde d'un volume vers une archive tar.gz :
```bash
docker run --rm \
  -v postgres_data:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_backup.tar.gz -C /source .
```

### 2. Restauration d'une archive dans un nouveau volume :
```bash
# Créer le nouveau volume de destination
docker volume create postgres_data_restored

# Extraire l'archive dans le volume
docker run --rm \
  -v postgres_data_restored:/target \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_data_backup.tar.gz -C /target
```
