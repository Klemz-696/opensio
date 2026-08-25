# ✍️ Guide d'Écriture d'un Module SISR — OpenSIO

Ce guide de référence s'adresse aux enseignants, formateurs et contributeurs souhaitant concevoir et intégrer de nouveaux contenus pédagogiques (parcours, modules, leçons, quiz et ateliers pratiques) dans **OpenSIO**.

Conformément à la règle architecturale **D-02**, le dossier `content/` constitue l'**unique source de vérité** du contenu pédagogique. Tout le contenu est versionné sous Git et validé par des schémas stricts **Zod** (`@opensio/content-schema`) avant d'être synchronisé en base de données.

---

## 🗂️ 1. Arborescence Standard du Dossier `content/`

Chaque module s'intègre dans un parcours de formation (_track_). L'arborescence doit respecter scrupuleusement la structure suivante :

```
content/
└── tracks/
    └── {track-slug}/                         # Ex: annee-1, annee-2
        ├── track.yaml                       # Métadonnées du parcours
        └── modules/
            └── {module-slug}/               # Ex: reseaux-fondamentaux, linux-administration
                ├── module.yaml              # Métadonnées du module
                ├── lessons/
                │   ├── 01-nom-lecon.md      # Cours en Markdown + Frontmatter YAML
                │   └── 02-autre-lecon.md
                ├── quizzes/
                │   └── quiz-nom.yaml        # Quiz d'évaluation en YAML
                └── labs/
                    └── lab-nom/             # Atelier pratique
                        ├── lab.yaml         # Spécification et barème du lab
                        ├── files/           # Fichiers initiaux fournis à l'étudiant
                        │   └── config.conf
                        └── validator/       # Script et tests de validation
                            ├── validate.mjs # Script exécuté par le runner
                            ├── README.md    # Documentation du validateur
                            └── solutions/   # Jeux d'essais de référence
                                ├── valid/
                                └── invalid-example/
```

> ⚠️ **Règle de nommage des Slugs** : Tous les identifiants (`slug`) doivent obligatoirement être en **kebab-case** (lettres minuscules, chiffres et tirets uniquement, ex: `reseaux-fondamentaux`, `01-adressage-ipv4`).

---

## 📁 2. Fichiers de Structure : Parcours & Modules

### 2.1. Métadonnées de Parcours (`track.yaml`)

Fichier placé à la racine d'un parcours (`content/tracks/{track-slug}/track.yaml`) :

```yaml
slug: annee-1
title: "BTS SIO SISR — 1ère année"
description: "Fondamentaux des réseaux, systèmes Linux et Windows, virtualisation et services de base."
position: 1
```

### 2.2. Métadonnées de Module (`module.yaml`)

Fichier placé à la racine d'un module (`content/tracks/{track-slug}/modules/{module-slug}/module.yaml`) :

```yaml
slug: reseaux-fondamentaux
title: "Réseaux : fondamentaux"
description: "Adressage IPv4, calcul de masques et sous-réseaux, modèle OSI/TCP-IP et premiers diagnostics."
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

#### Champs du schéma `ModuleSchema` :

- `slug` _(string, obligatoire)_ : Identifiant kebab-case unique du module.
- `title` _(string, obligatoire)_ : Titre affiché dans le catalogue.
- `description` _(string, optionnel)_ : Résumé synthétique du module.
- `position` _(number, défaut 0)_ : Ordre d'affichage dans la liste du parcours.
- `difficulty` _(number, de 1 à 5, défaut 1)_ : Niveau d'exigence pédagogique.
- `estimated_minutes` _(number, défaut 0)_ : Temps total estimé d'apprentissage.
- `competency_refs` _(array de strings)_ : Codes du référentiel officiel BTS SIO (ex: `B1.1`, `B2.1`).
- `lessons` _(array de slugs)_ : Liste ordonnée des slugs de leçons composant le module.
- `quizzes` _(array de slugs)_ : Liste des slugs de quiz associés.
- `labs` _(array de slugs)_ : Liste des slugs d'ateliers pratiques associés.

---

## 📚 3. Format des Leçons Markdown (`lessons/*.md`)

Une leçon est un fichier Markdown (`.md`) dont l'en-tête contient un **frontmatter YAML** délimité par `---`.

### 3.1. Schéma Zod du Frontmatter (`LessonFrontMatterSchema`)

| Champ               | Type             | Obligatoire | Valeur par défaut | Description                                                      |
| ------------------- | ---------------- | ----------- | ----------------- | ---------------------------------------------------------------- |
| `slug`              | `string`         | **Oui**     | —                 | Identifiant kebab-case (ex: `adressage-ipv4`).                   |
| `title`             | `string`         | **Oui**     | —                 | Titre complet de la leçon.                                       |
| `version`           | `string`         | Non         | `"1.0.0"`         | Numéro de version sémantique du cours.                           |
| `last_reviewed`     | `string`         | Non         | —                 | Date de dernière relecture (ex: `"2026-08-24"`).                 |
| `difficulty`        | `number` (1 à 5) | Non         | `1`               | Niveau de difficulté de la leçon.                                |
| `estimated_minutes` | `number`         | Non         | `0`               | Durée moyenne de lecture active (en min).                        |
| `objectives`        | `string[]`       | Non         | `[]`              | Objectifs pédagogiques opérationnels.                            |
| `prerequisites`     | `string[]`       | Non         | `[]`              | Prérequis nécessaires avant d'aborder la leçon.                  |
| `competency_refs`   | `string[]`       | Non         | `[]`              | Compétences du référentiel BTS SISR visées.                      |
| `success_criteria`  | `string[]`       | Non         | `[]`              | Critères de maîtrise attendus.                                   |
| `labs`              | `object[]`       | Non         | `[]`              | Références d'ateliers associés (`slug`, `required`, `position`). |
| `references`        | `object[]`       | Non         | `[]`              | Liens externes et normes RFC (`label`, `url` valide).            |

### 3.2. Exemple Complet de Leçon Validée

````markdown
---
slug: adressage-ipv4
title: "Adressage IPv4 : classes, masques et notation CIDR"
version: 1.0.0
last_reviewed: "2026-08-24"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Convertir une adresse IPv4 en binaire et décimal"
  - "Calculer un masque de sous-réseau en notation CIDR"
  - "Déterminer l'adresse réseau, l'adresse de diffusion et la plage d'hôtes"
prerequisites: []
competency_refs:
  - "B2.1"
success_criteria:
  - "Réussir le quiz 'Adressage IPv4' avec au moins 80 %"
  - "Compléter le lab 'Plan d'adressage d'une PME'"
labs:
  - slug: plan-adressage-pme
    required: true
references:
  - label: "RFC 791 — Internet Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc791"
  - label: "RFC 1918 — Address Allocation for Private Internets"
    url: "https://www.rfc-editor.org/rfc/rfc1918"
---

# Adressage IPv4 : Fondamentaux et Calcul de Sous-Réseaux

L'adressage IPv4 constitue le socle des communications sur les réseaux locaux et l'Internet.

---

## 1. Structure d'une adresse IPv4

Une adresse IPv4 est un identifiant logique sur **32 bits**, découpé en 4 octets :

```text
Format décimal : 192.168.1.10
Format binaire : 11000000 . 10101000 . 00000001 . 00001010
```
````

### Commandes usuelles sous Linux

Pour afficher la configuration d'une interface réseau :

```bash
ip addr show eth0
```

````

---

## ❓ 4. Format des Quiz Interactifs (`quizzes/*.yaml`)

Les quiz permettent l'auto-évaluation immédiate de l'étudiant. La validation et la notation sont **100 % exécutées côté serveur**.

### 4.1. Règles Métier & Conception Pédagogique
- **Règle RM-01** : Le seuil de validation est fixé à **80 % par défaut** (`passing_score: 80`).
- **Règle Zéro-Fuite** : Les champs `correct` et `explanation` ne sont jamais transmis au client lors du chargement du quiz ; ils sont renvoyés uniquement dans le rapport de correction après soumission.
- **Règle des Pièges & Explications** : Chaque question doit comporter une `explanation` claire expliquant pourquoi la bonne réponse est exacte et pourquoi les autres choix sont des pièges classiques.
- **Types de questions** :
  - `single` : Choix unique (bouton radio). **Exactement 1** élément dans `correct`.
  - `multiple` : Choix multiple (cases à cocher). Au moins 1 élément dans `correct`. La note est binaire (tous les choix corrects doivent être cochés sans aucun intrus).

### 4.2. Exemple Complet de Quiz Conforme au Schéma Zod

```yaml
slug: quiz-adressage
title: "Quiz — Adressage IPv4"
passing_score: 80
position: 1
questions:
  - kind: single
    prompt: "Quelle est l'adresse réseau de l'hôte 192.168.1.77/26 ?"
    choices:
      - id: a
        text: "192.168.1.0"
      - id: b
        text: "192.168.1.64"
      - id: c
        text: "192.168.1.72"
      - id: d
        text: "192.168.1.76"
    correct:
      - b
    explanation: "Un masque /26 donne un pas de 64 adresses. Les blocs démarrent à .0, .64, .128. L'adresse .77 se situe dans l'intervalle [64, 127], son adresse réseau est donc 192.168.1.64."

  - kind: multiple
    prompt: "Quelles adresses font partie des plages privées définies par la RFC 1918 ?"
    choices:
      - id: a
        text: "10.20.0.1"
      - id: b
        text: "172.20.5.10"
      - id: c
        text: "192.168.100.254"
      - id: d
        text: "8.8.4.4"
    correct:
      - a
      - b
      - c
    explanation: "Les plages privées RFC 1918 sont 10.0.0.0/8, 172.16.0.0/12 et 192.168.0.0/16. L'adresse 8.8.4.4 est une adresse publique (Google DNS)."
````

---

## 🧪 5. Format des Ateliers Pratiques (`labs/*`)

Les ateliers pratiques permettent aux étudiants d'expérimenter sur des scénarios professionnels concrets.

### 5.1. Niveaux de Labs (`level`)

- `1_theory` : Atelier d'application théorique / calcul guidé.
- `2_files` : Manipulation et édition de fichiers de configuration (fichiers CSV, scripts, configs de services).
- `3_container` : Atelier conteneurisé Docker (service réseau à configurer et démarrer).
- `4_vm` : Atelier d'infrastructure lourde virtualisée (Proxmox VE / topologies multi-machines).

### 5.2. Spécification `lab.yaml`

```yaml
slug: plan-adressage-pme
title: "Plan d'adressage d'une PME"
level: 2_files
max_score: 100
estimated_minutes: 40
context: |
  Une PME dispose de 3 services :
  - Production : 50 postes
  - Invités : 20 postes
  - Comptabilité : 10 postes

  L'adresse globale allouée pour le site est 10.20.0.0/24.
  Vous devez concevoir le plan d'adressage VLSM optimisé dans plan.csv.

objectives:
  - "Découper 10.20.0.0/24 en 3 sous-réseaux adaptés selon la méthode VLSM"
  - "Documenter chaque sous-réseau (réseau, préfixe, passerelle, hôtes, broadcast)"
  - "Garantir l'absence totale de chevauchement entre sous-réseaux"

prerequisites:
  - adressage-ipv4

files:
  editable:
    - path: plan.csv
      description: "service,network,prefix,gateway,first_host,last_host,broadcast"

hints:
  - cost_percent: 10
    text: "Commencez par le plus gros besoin (Production : 50 postes -> préfixe /26, 62 hôtes utilisables)."
  - cost_percent: 10
    text: "Poursuivez avec les Invités (20 postes -> /27) puis la Comptabilité (10 postes -> /28)."

validation:
  type: script
  image: opensio/validator-csv:latest
  timeout_seconds: 30
  checks:
    - id: subnets_valid
      required: true
      points: 60
      description: "Découpage VLSM et masques adaptés à chaque service"
    - id: no_overlap
      required: true
      points: 25
      description: "Aucun chevauchement d'adresses entre les sous-réseaux"
    - id: doc_complete
      required: false
      points: 15
      description: "Toutes les adresses (passerelle, 1ère, dernière, broadcast) sont cohérentes"

scoring:
  floor_percent: 50
```

### 5.3. Barème, Indices & Pénalités (Règles RM-04 & RM-05)

- **Critères obligatoires** (`required: true`) : Si un seul contrôle obligatoire échoue, le statut du lab est `FAILED` même si des points ont été obtenus sur d'autres contrôles.
- **Indices pénalisés** (`hints`) : Chaque déblocage d'indice déduit `cost_percent` points du score maximal.
- **Plancher de notation** (`floor_percent: 50`) : Même avec tous les indices débloqués, un étudiant validant tous les contrôles conservera au minimum 50 % des points (règle RM-05).

### 5.4. Script de Validation (`validator/validate.mjs`)

Le script de validation est exécuté par le runner dans le bac à sable de la session. Il doit afficher un JSON structuré sur sa sortie standard :

```javascript
// Exemple minimal de validator/validate.mjs
import fs from "fs";

const checks = [];
let planExists = fs.existsSync("./plan.csv");

checks.push({
  id: "subnets_valid",
  passed: planExists,
  message: planExists
    ? "Fichier plan.csv détecté et valide."
    : "Fichier plan.csv manquant.",
});

console.log(JSON.stringify({ checks }));
```

---

## ⚙️ 6. Commandes de Validation Locales

Avant de committer ou de proposer une mise à jour de contenu, utilisez les commandes intégrées du dépôt :

```bash
# 1. Valider la syntaxe et la conformité de tous les schémas Zod du dossier content/
pnpm content:validate

# 2. Tester l'idempotence et la synchronisation en base de données de développement
pnpm content:sync

# 3. Tester unitairement le validateur d'un lab avec ses solutions d'essai
cd content/tracks/annee-1/modules/reseaux-fondamentaux/labs/lab-plan-adressage/validator
node validate.mjs
```

---

## ✅ 7. Checklist de Publication d'un Module

Avant d'ouvrir une Pull Request pour intégrer un nouveau module pédagogique, vérifiez les 8 points suivants :

- [ ] **1. Nomenclature des Slugs** : Tous les dossiers et fichiers respectent le format kebab-case (`annee-X`, `module-nom`, `01-lecon.md`, `quiz-nom.yaml`, `lab-nom`).
- [ ] **2. Validité Zod** : La commande `pnpm content:validate` s'exécute avec succès (0 erreur Zod).
- [ ] **3. Liens de Références** : Tous les liens externes dans `references` contiennent des URLs complètes et valides (`https://...`).
- [ ] **4. Clés de Quiz Cohérentes** : Pour chaque question de quiz, les identifiants déclarés dans `correct` existent exactement dans `choices`.
- [ ] **5. Explications Pédagogiques** : Chaque question de quiz dispose d'une explication justifiant la bonne réponse et les pièges.
- [ ] **6. Barème de Lab Équilibré** : La somme des `points` des `checks` de validation est égale à `max_score` (ex: $60 + 25 + 15 = 100$).
- [ ] **7. Jeux d'Essais du Lab** : Le dossier `validator/solutions/` contient au moins un cas `valid` (100% des points) et des cas `invalid-*` prouvant l'efficacité de la détection d'erreurs.
- [ ] **8. Synchronisation Sans Orphelin** : `pnpm content:sync` s'exécute sans avertissement d'entité orpheline non rattachée.
