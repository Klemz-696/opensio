# Guide d'Auteur de Contenu Pédagogique — OpenSIO

Ce document décrit les conventions et règles contractuelles de rédaction du contenu pédagogique pour la plateforme **OpenSIO** (BTS SIO SISR). Le répertoire `content/` constitue la source unique de vérité, versionnée dans Git et synchronisée avec PostgreSQL via `pnpm content:sync`.

---

## 1. Arborescence du Catalogue

```
content/
├── README.md                               # Ce guide
├── validate.mjs                            # Script de validation globale autonome
└── tracks/
    └── {track-slug}/                       # Ex : annee-1
        ├── track.yaml                      # Définition du parcours
        └── modules/
            └── {module-slug}/              # Ex : reseaux-fondamentaux, windows-server-ad
                ├── module.yaml             # Définition du module
                ├── lessons/
                │   ├── 01-slug-lecon.md    # Leçon en Markdown + front-matter YAML
                │   └── ...
                ├── quizzes/
                │   ├── quiz-slug.yaml      # Quiz d'évaluation (YAML)
                │   └── ...
                └── labs/
                    └── lab-slug/           # Atelier pratique
                        ├── lab.yaml        # Définition et barème du lab
                        ├── files/          # Fichiers initiaux fournis à l'étudiant
                        └── validator/      # Validateur et jeux de tests
                            ├── README.md   # Documentation du validateur
                            ├── validate.mjs# Script de validation exécutable
                            └── solutions/  # Jeux de tests (valid, invalid-*)
```

---

## 2. Règles de Nommage et Slugs

- Tous les identifiants (`slug`) doivent être en **kebab-case** strict (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
- Les noms de fichiers de leçons sont préfixés par leur numéro d'ordre (ex. : `01-installation-et-roles.md`).
- Les noms de fichiers de quiz suivent le format `quiz-{slug}.yaml`.
- Les dossiers d'ateliers sont situés sous `labs/lab-{nom}/` ou `labs/{nom}/`.

---

## 3. Schémas et Formats

### 3.1. Parcours (`track.yaml`)

```yaml
slug: annee-1
title: "BTS SIO SISR — 1ère année"
description: "Fondamentaux des réseaux, systèmes Linux et Windows, virtualisation et services de base."
position: 1
```

### 3.2. Module (`module.yaml`)

```yaml
slug: reseaux-fondamentaux
title: "Réseaux : fondamentaux"
description: "Description synthétique du module."
position: 1
difficulty: 2
estimated_minutes: 600
competency_refs:
  - "B2.1"
  - "B2.2"
lessons:
  - adressage-ipv4
quizzes:
  - quiz-adressage
labs:
  - plan-adressage-pme
```

### 3.3. Leçon (`lessons/*.md`)

```markdown
---
slug: adressage-ipv4
title: "Adressage IPv4 : classes, masques et notation CIDR"
version: 1.0.0
last_reviewed: "2026-08-24"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Convertir une adresse IPv4 en binaire et décimal"
prerequisites: []
competency_refs:
  - "B2.1"
success_criteria:
  - "Réussir le quiz associé avec au moins 80 %"
labs:
  - slug: plan-adressage-pme
    required: true
references:
  - label: "RFC 791 — Internet Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc791"
---

# Titre de la leçon

Contenu pédagogique structuré en Markdown.
```

### 3.4. Quiz (`quizzes/*.yaml`)

- `passing_score: 80` par défaut (RM-01).
- Types : `single` (exactement 1 choix correct) ou `multiple` (au moins 1 choix correct).
- Chaque question doit comporter un champ `explanation` détaillant la justification pédagogique.

```yaml
slug: quiz-exemple
title: "Quiz — Exemple"
passing_score: 80
position: 1
questions:
  - kind: single
    prompt: "Énoncé de la question ?"
    choices:
      - id: a
        text: "Choix 1"
      - id: b
        text: "Choix 2"
    correct:
      - a
    explanation: "Explication pédagogique détaillée."
```

### 3.5. Atelier pratique (`labs/*/lab.yaml`)

- Niveaux : `1_theory`, `2_files`, `3_container`, `4_vm`.
- Pour le niveau `2_files`, la somme des `points` des contrôles (`checks`) doit être égale à `max_score`.
- Tout lab doit comporter au moins un jeu d'essai valide (`solutions/valid/`) et un jeu d'essai invalide (`solutions/invalid-*/`).

---

## 4. Outils de Validation

- `node content/validate.mjs` : validation locale complète de l'ensemble des fichiers YAML/Markdown et exécution des suites de tests de tous les validateurs de labs.
- `pnpm content:validate` : validation par les schémas Zod du package `@opensio/content-schema`.
- `pnpm content:sync` : synchronisation idempotente dans PostgreSQL.
