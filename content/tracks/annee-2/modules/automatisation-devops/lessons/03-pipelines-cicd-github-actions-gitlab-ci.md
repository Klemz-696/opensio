---
slug: pipelines-cicd-github-actions-gitlab-ci
title: "Pipelines CI/CD, Automatisation avec GitHub Actions et Stratégies de Déploiement"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Concevoir un pipeline d'automatisation CI/CD complet avec GitHub Actions"
  - "Maîtriser les déclencheurs (triggers), jobs parallèles et dépendances séquentielles (needs)"
  - "Sécuriser les flux en gérant les secrets d'infrastructure sans fuite dans les journaux"
  - "Optimiser les temps de build grâce à la mise en cache et à l'échange d'artefacts"
  - "Comparer les stratégies de déploiement en production (Rolling, Blue/Green, Canary)"
prerequisites:
  - "principes-devops-et-culture-cicd"
  - "conteneurisation-docker"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Pipelines CI/CD et GitHub Actions' avec au moins 80 %"
labs:
  - slug: definition-pipeline-cicd-github-actions
    required: true
references:
  - label: "GitHub Actions Official Documentation"
    url: "https://docs.github.com/en/actions"
  - label: "GitLab CI/CD Documentation"
    url: "https://docs.gitlab.com/ee/ci/"
---

# Pipelines CI/CD, Automatisation avec GitHub Actions et Stratégies de Déploiement

Un pipeline **CI/CD** industrialise l'ensemble des étapes séparant la validation d'une modification de code par un développeur de sa mise en service effective sur les serveurs de production.

---

## 1. Structure et Anatomie d'un Workflow GitHub Actions

Un workflow GitHub Actions est déclaré dans un fichier YAML situé dans le répertoire `.github/workflows/` du dépôt :

```text
┌─────────────────────────────────────────────────────────────┐
│ Workflow (ex: .github/workflows/deploy.yml)                │
│ Déclencheur (Trigger : push sur branche 'main')             │
│                                                             │
│   ┌───────────────────────────┐ ┌─────────────────────────┐ │
│   │ Job 1 : Lint & Tests      │ │ Job 2 : Audit Sécurité  │ │
│   │ (Runner : ubuntu-latest)  │ │ (Runner: ubuntu-latest) │ │
│   │  - Step 1: Checkout git   │ │  - Step 1: Checkout git │ │
│   │  - Step 2: Setup Node.js  │ │  - Step 2: Audit Trivy  │ │
│   │  - Step 3: npm test       │ └────────────┬────────────┘ │
│   └─────────────┬─────────────┘              │              │
│                 └──────────────┬─────────────┘              │
│                                ▼ (needs: [test, audit])     │
│                 ┌─────────────────────────────┐             │
│                 │ Job 3 : Build & Déploiement │             │
│                 │ (Condition : branche main)  │             │
│                 │  - Step 1: Build Docker     │             │
│                 │  - Step 2: Push Registre    │             │
│                 │  - Step 3: Déploiement Prod │             │
│                 └─────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Exemple de Pipeline Complet de Production

```yaml
name: "Pipeline CI/CD Production"

# 1. Déclencheurs d'événements
on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

# 2. Définition des jobs
jobs:
  # Job de validation et tests (exécuté sur PR et push)
  test:
    runs-on: ubuntu-latest
    steps:
      - name: "Récupération du code source"
        uses: actions/checkout@v4

      - name: "Configuration de l'environnement Node.js"
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - name: "Installation des dépendances"
        run: npm ci

      - name: "Vérification de la qualité du code (Linter)"
        run: npm run lint

      - name: "Exécution des tests unitaires et d'intégration"
        run: npm test

  # Job de construction et déploiement (uniquement sur push main après succès des tests)
  deploy:
    runs-on: ubuntu-latest
    needs: test # Dépendance stricte : attend le succès du job test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: "Récupération du code source"
        uses: actions/checkout@v4

      - name: "Configuration de Node.js"
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - name: "Installation et Build des artefacts"
        run: |
          npm ci
          npm run build

      - name: "Archivage des artefacts compilés"
        uses: actions/upload-artifact@v4
        with:
          name: production-build
          path: dist/
          retention-days: 7

      - name: "Déploiement sécurisé sur l'infrastructure de production"
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}
          API_URL: ${{ vars.PROD_API_URL }}
        run: |
          echo "Déploiement des artefacts vers ${API_URL}..."
          # Commande de déploiement sécurisée (ex: ansible-playbook ou rsync via SSH)
```

---

## 3. Stratégies de Déploiement en Production

Pour éviter les coupures de service (*Downtime*) lors de la mise en ligne d'une nouvelle version :

| Stratégie | Fonctionnement | Avantages & Inconvénients |
|---|---|---|
| **Recreate** | Arrêt de la version N, puis démarrage de la version N+1 | Simple mais induit une interruption de service temporaire. |
| **Rolling Update** | Mise à jour progressive instance par instance derrière le load balancer | Zéro coupure, mais cohabitation temporaire des versions N et N+1. |
| **Blue/Green** | Deux environnements identiques (Bleu = Actif, Vert = Nouveau). Bascule instantanée du trafic via le Reverse Proxy | Rollback instantané en cas d'anomalie, mais doublement temporaire des coûts d'infrastructure. |
| **Canary Release** | Déploiement de la version N+1 pour un faible pourcentage d'utilisateurs (5%), puis élargissement progressif | Détection précoce des bugs sur trafic réel sans impacter la majorité des utilisateurs. |
