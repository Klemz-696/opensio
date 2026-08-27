---
slug: reseau-docker-et-communication-inter-conteneurs
title: "Réseau Docker, Publication de Ports et Résolution DNS Interne"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 50
objectives:
  - "Comparer les différents pilotes de réseaux Docker (bridge, host, none, macvlan, overlay)"
  - "Maîtriser la publication et le mappage de ports (-p hôte:conteneur)"
  - "Créer et administrer des réseaux personnalisés (User-Defined Bridge Networks)"
  - "Exploiter le serveur DNS interne de Docker pour la communication inter-conteneurs"
  - "Isoler des services applicatifs au sein de sous-réseaux dédiés"
prerequisites:
  - "reseaux-fondamentaux"
  - "principes-conteneurisation-et-cycle-vie"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Réseau Docker et Communication' avec au moins 80 %"
labs: []
references:
  - label: "Docker Networking Overview"
    url: "https://docs.docker.com/network/"
  - label: "Embedded DNS in user-defined networks"
    url: "https://docs.docker.com/network/drivers/bridge/#differences-between-user-defined-bridges-and-the-default-bridge"
---

# Réseau Docker, Publication de Ports et Résolution DNS Interne

Le sous-système réseau de Docker isole les piles réseau des conteneurs via les `network namespaces` de Linux, tout en offrant des mécanismes de communication inter-services et de publication vers l'extérieur.

---

## 1. Les Pilotes de Réseau Docker (_Network Drivers_)

```text
┌─────────────────────────────────────────────────────────────┐
│                 Hôte Docker (ex: Linux)                     │
│                                                             │
│   ┌──────────────────┐               ┌──────────────────┐   │
│   │ Conteneur Web    │               │ Conteneur DB     │   │
│   │ IP: 172.20.0.2   │               │ IP: 172.20.0.3   │   │
│   └────────┬─────────┘               └────────┬─────────┘   │
│            │ (veth0)                          │ (veth1)     │
│            └───────────────┬──────────────────┘             │
│                            ▼                                │
│                [ Bridge custom-net (br-xxxx) ]              │
│                 DNS Interne : 127.0.0.11                    │
│                            │                                │
│                      (iptables NAT)                         │
│                            ▼                                │
│               [ Interface Physique eth0 ]                   │
└────────────────────────────┬────────────────────────────────┘
                             ▼
                         (Internet)
```

| Pilote | Fonctionnement | Cas d'Usage |
|---|---|---|
| **`bridge`** (défaut) | Crée un commutateur virtuel logiciel privé avec NAT sortant | Architecture standard sur un hôte unique |
| **`host`** | Supprime l'isolation réseau : le conteneur utilise directement les interfaces de l'hôte | Débit maximal, services réseau natifs |
| **`none`** | Désactive tout accès réseau (seule l'interface `lo` est présente) | Traitements sécurisés étanches (batch, calcul) |
| **`macvlan`** | Assigne une adresse MAC et une IP directe du réseau physique local | Équipements hérités nécessitant une IP directe du LAN |
| **`overlay`** | Réseau maillé VXLAN multi-hôtes | Clusters distribués (Docker Swarm / Kubernetes) |

---

## 2. Publication et Mappage de Ports

Par défaut, les ports ouverts dans un conteneur ne sont joignables que depuis les autres conteneurs du même réseau Docker.

Pour rendre un service accessible depuis l'extérieur de l'hôte, on utilise l'option `-p` :
- `docker run -d -p 80:8080 nginx` : Le port 80 de l'hôte redirige vers le port 8080 du conteneur sur toutes les interfaces (`0.0.0.0`).
- `docker run -d -p 127.0.0.1:5432:5432 postgres` : **Sécurisation** : le port 5432 n'est accessible que depuis la machine locale (*localhost*).

---

## 3. Réseau Personnalisé et DNS Intégré

Sur le réseau par défaut (`bridge`), la résolution de nom automatique par nom de conteneur est désactivée.

La bonne pratique consiste à créer des **réseaux personnalisés** (_User-Defined Networks_) :
```bash
# 1. Création d'un réseau bridge dédié
docker network create --driver bridge app-network

# 2. Lancement de la base de données sur ce réseau
docker run -d --name database --network app-network -e POSTGRES_PASSWORD=secret postgres:alpine

# 3. Lancement de l'application Web sur le même réseau
docker run -d --name backend --network app-network -p 3000:3000 my-app:latest
```

> [!IMPORTANT]
> **Résolution DNS interne automatique** : Au sein du réseau `app-network`, le conteneur `backend` peut se connecter directement à la base de données en utilisant le nom d'hôte `database` (`postgres://database:5432/app_db`). Le résolveur DNS intégré de Docker (`127.0.0.11`) traduit dynamiquement le nom en adresse IP sans configuration manuelle.
