---
slug: orchestration-multi-services-docker-compose
title: "Orchestration Multi-Services avec Docker Compose, Healthchecks et Scaling"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Structurer une application multi-niveaux complète dans un fichier compose.yaml"
  - "Définir des services interconnectés avec gestion fine des réseaux et volumes"
  - "Implémenter des sondes d'état (Healthchecks) et des conditions de démarrage (depends_on)"
  - "Configurer des politiques de redémarrage automatique en production (restart: unless-stopped)"
  - "Piloter la pile applicative avec la CLI Docker Compose (up, down, ps, logs, scale)"
prerequisites:
  - "principes-conteneurisation-et-cycle-vie"
  - "dockerfile-construction-et-bonnes-pratiques"
  - "reseau-docker-et-communication-inter-conteneurs"
  - "volumes-stockage-et-persistance"
competency_refs:
  - "B1.5"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Orchestration Multi-Services avec Docker Compose' avec au moins 80 %"
labs:
  - slug: deploiement-stack-docker-compose
    required: true
references:
  - label: "Docker Compose Specification"
    url: "https://docs.docker.com/compose/compose-file/"
  - label: "Compose CLI reference"
    url: "https://docs.docker.com/compose/reference/"
---

# Orchestration Multi-Services avec Docker Compose, Healthchecks et Scaling

Une application d'entreprise moderne est rarement constituée d'un seul conteneur. Elle combine généralement un serveur Web (Nginx), un backend applicatif (Node.js/Python), une base de données relationnelle (PostgreSQL) et un cache mémoire (Redis).

**Docker Compose** permet de déclarer, configurer et piloter cette pile applicative multi-conteneurs au sein d'un fichier unique `docker-compose.yml` (ou `compose.yaml`).

---

## 1. Structure d'un Fichier `compose.yaml` Complet

```yaml
services:
  # ─── 1. Reverse Proxy Public ───
  proxy:
    image: nginx:alpine
    container_name: app-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - frontend-net
    restart: unless-stopped

  # ─── 2. Backend Applicatif ───
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: app-backend
    environment:
      DATABASE_URL: postgres://user:secret@database:5432/appdb
      REDIS_HOST: cache
    depends_on:
      database:
        condition: service_healthy
      cache:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - frontend-net
      - backend-net
    restart: unless-stopped

  # ─── 3. Base de Données ───
  database:
    image: postgres:16-alpine
    container_name: app-database
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend-net
    restart: unless-stopped

  # ─── 4. Cache Mémoire ───
  cache:
    image: redis:7-alpine
    container_name: app-cache
    networks:
      - backend-net
    restart: unless-stopped

# ─── Déclaration des Volumes Persistants ───
volumes:
  db-data:
    name: prod-postgres-data

# ─── Déclaration des Réseaux Isolés ───
networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
```

---

## 2. Concepts et Directives Avancées

1. **Isolation réseau multi-niveaux** :
   - Le service `proxy` n'est connecté qu'à `frontend-net` (il ne peut pas joindre directement la base de données).
   - Le service `database` n'est connecté qu'à `backend-net` (il est totalement invisible et inaccessible depuis Internet).
   - Le service `backend` fait la passerelle en étant connecté aux deux réseaux.
2. **Sondes de santé (`healthcheck`) & Démarrage ordonné (`depends_on`)** :
   - Plutôt que de lancer le backend alors que PostgreSQL n'est pas encore prêt à accepter des connexions, `condition: service_healthy` bloque le démarrage du backend jusqu'au succès du test `pg_isready`.
3. **Politiques de redémarrage (`restart: unless-stopped`)** :
   - Redémarre automatiquement les conteneurs en cas de crash applicatif ou lors du redémarrage du serveur hôte.

---

## 3. Commandes d'Exploitation Docker Compose

| Commande | Action |
|---|---|
| `docker compose up -d` | Construit les images, crée les réseaux/volumes et démarre tous les services en arrière-plan |
| `docker compose ps` | Affiche l'état d'exécution et de santé (`healthy`/`unhealthy`) des services de la pile |
| `docker compose logs -f backend` | Suit les journaux d'un service spécifique |
| `docker compose exec backend sh` | Ouvre un shell interactif dans le conteneur du service `backend` |
| `docker compose down` | Arrête et détruit les conteneurs et les réseaux créés |
| `docker compose down -v` | Arrête la pile et **supprime également les volumes nommés** (attention aux données !) |
| `docker compose up -d --scale backend=3` | Lance 3 réplicas du backend pour la répartition de charge |
