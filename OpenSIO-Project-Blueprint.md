---
project: OpenSIO
document_type: project-blueprint
version: 0.2.0
language: fr
status: draft-validated
intended_consumer: Antigravity-Gemini-3.7-Flash-High
primary_goal: bootstrap-development
supersedes: SISRAcademy-Project-Blueprint v0.1.0
---

# OpenSIO — Dossier de conception complet

> Plateforme auto-hébergée de formation et de révision pratique pour le BTS SIO option SISR.
> Document de référence destiné à l'agent de développement Antigravity. Toute implémentation doit suivre ce document ; toute déviation doit être signalée et justifiée.
>
> **Historique** : v0.1.0 (projet « SISRAcademy ») → v0.2.0 : renommage en **OpenSIO**, arbitrages du commanditaire intégrés (§18, D-06 à D-18), quotas Proxmox adaptés à un hôte 16 Go RAM / 500 Go, convention de taille de fichiers (D-13).

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Vision et objectifs](#2-vision-et-objectifs)
3. [Public cible](#3-public-cible)
4. [Problèmes résolus](#4-problèmes-résolus)
5. [Périmètre](#5-périmètre)
6. [Hors périmètre](#6-hors-périmètre)
7. [Hypothèses](#7-hypothèses)
8. [Contraintes](#8-contraintes)
9. [Personas](#9-personas)
10. [Parcours utilisateurs](#10-parcours-utilisateurs)
11. [Fonctionnalités détaillées](#11-fonctionnalités-détaillées)
12. [Règles métier](#12-règles-métier)
13. [Architecture logique](#13-architecture-logique)
14. [Architecture physique](#14-architecture-physique)
15. [Flux réseau](#15-flux-réseau)
16. [Flux de données](#16-flux-de-données)
17. [Stack technique comparée](#17-stack-technique-comparée)
18. [Décisions d'architecture](#18-décisions-darchitecture)
19. [Structure du dépôt et conventions de code](#19-structure-du-dépôt-et-conventions-de-code)
20. [Modèle de données](#20-modèle-de-données)
21. [Schéma relationnel textuel](#21-schéma-relationnel-textuel)
22. [API et endpoints](#22-api-et-endpoints)
23. [Événements et WebSocket](#23-événements-et-websocket)
24. [Formats Markdown et YAML](#24-formats-markdown-et-yaml)
25. [Stratégie de contenu](#25-stratégie-de-contenu)
26. [Gestion des labs](#26-gestion-des-labs)
27. [Intégration Proxmox](#27-intégration-proxmox)
28. [Intégration IA](#28-intégration-ia)
29. [Authentification et autorisation](#29-authentification-et-autorisation)
30. [Sécurité applicative](#30-sécurité-applicative)
31. [Sécurité infrastructure](#31-sécurité-infrastructure)
32. [Sauvegarde et restauration](#32-sauvegarde-et-restauration)
33. [Supervision et observabilité](#33-supervision-et-observabilité)
34. [Gestion des erreurs](#34-gestion-des-erreurs)
35. [Stratégie de tests](#35-stratégie-de-tests)
36. [CI/CD](#36-cicd)
37. [Déploiement local](#37-déploiement-local)
38. [Déploiement homelab](#38-déploiement-homelab)
39. [Variables d'environnement](#39-variables-denvironnement)
40. [Exigences matérielles](#40-exigences-matérielles)
41. [Performance](#41-performance)
42. [Accessibilité](#42-accessibilité)
43. [Journalisation](#43-journalisation)
44. [RGPD](#44-rgpd)
45. [Roadmap](#45-roadmap)
46. [Backlog priorisé](#46-backlog-priorisé)
47. [User stories](#47-user-stories)
48. [Critères d'acceptation](#48-critères-dacceptation)
49. [Risques et mesures de réduction](#49-risques-et-mesures-de-réduction)
50. [Plan de démonstration](#50-plan-de-démonstration)
51. [Éléments pour le rapport de BTS](#51-éléments-pour-le-rapport-de-bts)
52. [Glossaire](#52-glossaire)
53. [Annexes et exemples de fichiers](#53-annexes-et-exemples-de-fichiers)
- [Instructions pour Antigravity](#instructions-pour-antigravity)

---

## 1. Résumé exécutif

OpenSIO est une plateforme web auto-hébergée permettant à un étudiant de BTS SIO option SISR de réviser l'intégralité du programme (1ère et 2ème année) par la pratique : cours structurés en Markdown versionné, quiz auto-corrigés, suivi de progression, labs pratiques à validation automatique, scénarios de panne simulés, et — en version avancée — orchestration de machines virtuelles Proxmox et chatbot pédagogique IA.

Le projet est conçu pour un homelab de taille modeste (hôte Proxmox VE **16 Go RAM / 500 Go de stockage**, Docker), avec un niveau d'exigence professionnel : architecture documentée, tests automatisés, CI/CD GitHub Actions, sécurité applicative et conformité RGPD minimale. Il est valorisable en épreuve E5, en rapport de stage et en soutenance.

**Décision structurante n°1** : le périmètre est découpé en 4 jalons stricts (MVP → intermédiaire → avancé → expérimental). Aucune fonctionnalité d'un jalon N+1 ne doit être commencée avant la validation complète du jalon N.

**Décision structurante n°2** : le contenu pédagogique (leçons, quiz, définitions de labs) vit dans Git en Markdown/YAML. PostgreSQL ne stocke que l'index de lecture et les données de progression des utilisateurs.

**Décision structurante n°3** : l'orchestration Proxmox n'est jamais exposée au navigateur. Un service backend dédié applique une liste blanche d'actions, avec un mode simulation obligatoire pour le développement.

**Décision structurante n°4 (D-13)** : aucun fichier source ne dépasse ~400 lignes (cible 200–400). Tout fichier qui approche cette limite est découpé par responsabilité. Cette convention existe pour faciliter l'analyse et la manipulation du code par des agents IA.

---

## 2. Vision et objectifs

### 2.1 Vision

Devenir la plateforme de référence personnelle (puis potentiellement open source) pour apprendre le SISR par la pratique, en réutilisant l'infrastructure homelab comme terrain d'entraînement.

### 2.2 Objectifs mesurables

| # | Objectif | Indicateur | Cible |
|---|----------|-----------|-------|
| O1 | Couvrir le programme SISR 1ère année | Modules publiés | 5 modules MVP (P0), 8 à terme |
| O2 | Permettre l'auto-évaluation | Quiz par module | ≥ 1 quiz/module, ≥ 10 questions |
| O3 | Entraîner au dépannage | Scénarios de panne jouables | 5 en MVP, 10 en v1.0 |
| O4 | Suivre la progression | Dashboard fonctionnel | progression par module/compétence |
| O5 | Démontrer une compétence DevSecOps | Pipeline CI vert, tests | couverture ≥ 60 % sur le backend |
| O6 | Déployer en conditions réelles | Stack Docker Compose en homelab | 1 commande de déploiement |

### 2.3 Non-objectifs

- Ne pas remplacer une formation encadrée.
- Ne pas devenir une plateforme multi-tenant commerciale.
- Ne pas viser la haute disponibilité de production (homelab = mono-nœud accepté).

---

## 3. Public cible

| Segment | Description | Priorité |
|---------|-------------|----------|
| Étudiant BTS SIO SISR (l'auteur) | Utilisateur principal, révision personnelle | P0 |
| Étudiants pairs (promotion) | Utilisateurs secondaires, retours d'usage | P1 |
| Formateur / jury BTS | Consultation en démonstration, évaluation du projet | P1 |
| Contributeurs open source éventuels | Après publication publique du dépôt | P2 |

---

## 4. Problèmes résolus

1. **Dispersion des révisions** : les cours SISR sont éparpillés (PDF, notes, TP, sites web). OpenSIO centralise un parcours structuré et versionné.
2. **Manque de pratique encadrée** : les TP de formation ne sont pas rejouables à volonté. Les labs à validation automatique permettent l'entraînement répété.
3. **Pas de feedback immédiat** : hors présence d'un professeur, l'étudiant ne sait pas si sa résolution est correcte. Les validateurs automatiques comblent ce manque.
4. **Préparation insuffisante aux épreuves pratiques** : les scénarios de panne simulent les situations d'E5/E6 (diagnostic, justification, remédiation).
5. **Portfolio peu démontrable** : le projet lui-même constitue une preuve de compétences (full-stack, DevOps, sécurité, documentation).

---

## 5. Périmètre

### 5.1 Jalon MVP (v0.1) — réellement développable

- Authentification email/mot de passe (JWT HS256 access + refresh), rôles `student` et `admin`.
- Catalogue de contenu : années → modules → leçons, chargé depuis des fichiers Markdown + métadonnées YAML synchronisés en base.
- Quiz à choix multiples (QCM) avec correction immédiate et score.
- Suivi de progression : leçon lue, quiz réussi, temps passé (déclaratif + mesuré côté client).
- Dashboard : progression par année/module, derniers éléments consultés, scores.
- Labs de niveau 1 (théoriques guidés) et niveau 2 (édition de fichiers dans le navigateur + validation par script dans un conteneur jetable).
- 5 scénarios de panne en mode « guidé » (diagnostic textuel + QCM de résolution, sans infrastructure réelle).
- Journalisation applicative structurée, endpoint de santé.
- Déploiement Docker Compose (frontend, backend, PostgreSQL, reverse proxy Caddy).
- CI GitHub Actions : lint, tests unitaires, build.
- Export et suppression des données utilisateur (RGPD minimal).

### 5.2 Jalon intermédiaire (v0.2)

- Rôle `teacher` (formateur) : consultation des progressions agrégées.
- Labs de niveau 3 : conteneurs Docker éphémères par session (ex. : un serveur DNS cassé à réparer) **avec terminal web intégré** (xterm.js + passerelle WebSocket NestJS, D-14).
- Chatbot IA pédagogique : **mode Ollama local par défaut, mode API distante optionnel** (D-16), même interface.
- Redis : files de tâches (exécution des validateurs), cache catalogue, rate limiting distribué.
- Badges / gamification raisonnable (module terminé, série de 7 jours, lab sans indice).
- Recherche plein texte dans les leçons (PostgreSQL `tsvector`).
- Tests E2E Playwright sur les parcours critiques.
- 10 scénarios de panne (dont 5 avec conteneurs réels).

### 5.3 Jalon avancé (v1.0)

- Labs de niveau 4 : machines virtuelles Proxmox **Debian uniquement** (contrainte hôte 16 Go, D-15/§27), clonage de modèles, snapshots, réseau isolé, TTL, nettoyage automatique.
- **Console noVNC proxifiée** pour les VM de labs (D-15).
- Mode « examen blanc » : scénario chronométré, notation, compte rendu PDF.
- Prometheus + Grafana : métriques applicatives et hôte.
- Notifications (email via SMTP local, webhook Discord optionnel).
- Ansible : playbook de déploiement complet de la plateforme.
- 2FA TOTP.

### 5.4 Expérimental / optionnel (hors engagement)

- MinIO/S3 pour les artefacts de labs.
- RAG (recherche vectorielle pgvector) pour le chatbot sur le corpus de cours.
- Service IA Python/FastAPI séparé (si besoin de modèles locaux lourds).
- Wazuh ou Suricata en démonstration de supervision sécurité.
- Multi-langue (i18n).

---

## 6. Hors périmètre

| Élément | Statut | Justification |
|---------|--------|---------------|
| Application mobile native | Hors périmètre | Web responsive suffit |
| Paiement / abonnements | Hors périmètre | Usage personnel/pédagogique |
| Multi-tenant SaaS | Hors périmètre | Mono-instance homelab |
| Édition de contenu dans le navigateur (CMS) | Hors périmètre MVP et v0.2 | Le contenu se versionne dans Git ; un CMS ferait doublon avec Git |
| Visioconférence / classes virtuelles | Hors périmètre | Sans rapport avec les objectifs |
| Orchestration Kubernetes | Hors périmètre | Docker Compose suffit ; K8s mentionné en culture générale uniquement |
| Exposition publique Internet | Déconseillé | Homelab derrière reverse proxy local/VPN ; voir §31 |
| MongoDB ou second SGBD | Refusé | PostgreSQL couvre tous les besoins du MVP et au-delà |
| **VM Windows Server pour les labs** | **Refusé (contrainte hôte)** | Hôte Proxmox limité à 16 Go RAM : une VM Windows Server (≥ 4 Go) mettrait l'hôte sous pression. Les compétences AD/GPO sont couvertes par des labs guidés (niveau 1) et des labs fichiers (niveau 2, ex. : édition de stratégies, scripts PowerShell validés statiquement) |

---

## 7. Hypothèses

- H1. **Confirmé** : l'hôte Proxmox VE dispose de **16 Go de RAM et 500 Go de stockage**. Les quotas de labs (§27.3) et les exigences (§40) sont dimensionnés en conséquence.
- H2. La plateforme tourne dans une VM ou un LXC dédié sur cet hôte, avec Docker installé.
- H3. Le réseau homelab est derrière une box/NAT ; l'accès distant se fait par VPN (WireGuard) ou pas du tout.
- H4. Un seul administrateur (l'auteur) ; quelques comptes étudiants pour les pairs.
- H5. Le contenu pédagogique est rédigé par l'auteur ; pas de problème de droits sur du contenu tiers (citations et liens uniquement).
- H6. **Confirmé** : le chatbot supporte deux modes — Ollama local (défaut, 0 €) et API distante (optionnelle) — via la même abstraction (D-16). La plateforme fonctionne avec le chatbot désactivé.
- H7. **Confirmé** : aucun support de sauvegarde externe dédié (NAS, cloud) n'est disponible. La stratégie de sauvegarde (§32) est adaptée : copie locale + copie vers le PC Windows personnel + GitHub pour le contenu.

---

## 8. Contraintes

| Type | Contrainte |
|------|-----------|
| Budgétaire | 0 € de coût récurrent visé ; services cloud payants optionnels et désactivables |
| Temporelle | Rythme étudiant : ~10 h/semaine ; jalons dimensionnés en conséquence |
| Technique | Mono-nœud Docker Compose ; pas de dépendance obligatoire à un service externe |
| **Ressources** | **Hôte Proxmox 16 Go RAM / 500 Go : la plateforme + les labs VM simultanés ne doivent jamais dépasser ~12 Go RAM alloués au total (marge pour l'hyperviseur)** |
| Sécurité | Aucun secret dans Git ; API Proxmox jamais exposée au navigateur ; moindre privilège partout |
| Légale | RGPD minimal (données de compte et de progression) ; mentions légales si exposition |
| Pédagogique | Alignement sur le référentiel BTS SIO (blocs de compétences) ; contenu en français |
| Compatibilité | Navigateurs récents (Chrome, Firefox, Edge) ; responsive desktop d'abord, mobile lisible |
| **Code** | **Fichiers source de 200–400 lignes maximum (D-13) ; découpage par responsabilité obligatoire** |

---

## 9. Personas

### 9.1 « Lucas » — Étudiant SISR 2ème année (utilisateur principal)

- Objectifs : réviser efficacement, s'entraîner sur des pannes réalistes, préparer E5/E6.
- Frustrations : TP non rejouables, pas de correction immédiate, cours dispersés.
- Compétences : administration Linux/Windows, Docker, Proxmox, scripting.
- Usage : sessions de 30–90 min le soir, alternance cours/quiz/labs.

### 9.2 « Emma » — Étudiante SISR 1ère année (pair)

- Objectifs : comprendre les fondamentaux (adressage, VLAN, DNS), progresser à son rythme.
- Frustrations : peur de « casser » quelque chose, besoin d'indices progressifs.
- Usage : parcours guidé, labs niveau 1–2, chatbot pour débloquer.

### 9.3 « M. Dubois » — Formateur / jury (évaluateur)

- Objectifs : vérifier la couverture du référentiel, la qualité technique, la démarche.
- Usage : consultation du dashboard de démonstration, du dépôt Git, de la documentation.

---

## 10. Parcours utilisateurs

### 10.1 Parcours étudiant — révision d'un module

```mermaid
flowchart LR
    A[Connexion] --> B[Dashboard]
    B --> C[Choix année / module]
    C --> D[Lecture leçon]
    D --> E[Quiz du module]
    E -->|score >= seuil| F[Module validé]
    E -->|score < seuil| G[Recommandations + relecture]
    G --> D
    F --> H[Lab associé]
    H --> I[Validation automatique]
    I --> J[Badge / progression mise à jour]
```

### 10.2 Parcours étudiant — scénario de panne (MVP, mode guidé)

1. Le dashboard propose un scénario (ex. : « DHCP indisponible »).
2. L'étudiant lit le contexte et les symptômes (tickets utilisateurs simulés, extraits de logs fournis).
3. Il répond à une série de questions de diagnostic (ordre des vérifications, commandes à utiliser).
4. Il propose une remédiation (QCM + champ libre court).
5. La validation automatique note le diagnostic et la remédiation ; un corrigé expliqué s'affiche.

### 10.3 Parcours étudiant — lab niveau 2 (fichiers)

1. L'énoncé présente un fichier de configuration fautif (ex. : `dhcpd.conf`).
2. L'étudiant édite le fichier dans l'éditeur web intégré.
3. Il clique « Valider » : le backend copie le fichier dans un conteneur jetable, exécute un script de vérification, renvoie le résultat (succès/échecs détaillés).
4. Tentatives illimitées ; indices progressifs consommables (impact sur le score).

### 10.4 Parcours étudiant — lab niveau 3 (v0.2, conteneur + terminal web)

1. Le backend démarre un conteneur de travail éphémère dédié à la session (réseau interne isolé).
2. L'étudiant ouvre l'onglet « Terminal » : xterm.js se connecte à la passerelle WebSocket de l'API, qui authentifie la session puis attache un `docker exec` interactif dans le conteneur du lab (D-14).
3. L'étudiant diagnostique et répare dans le terminal ; il lance la validation depuis l'interface.
4. À la fin (succès, abandon ou TTL), le conteneur est détruit.

### 10.5 Parcours administrateur

- Synchroniser le contenu depuis Git (commande CLI ou bouton admin).
- Gérer les comptes (création, rôle, désactivation).
- Consulter les journaux d'audit et la santé de la plateforme.

### 10.6 Parcours formateur (v0.2)

- Consulter la progression agrégée des étudiants rattachés.
- Identifier les modules en échec (taux de réussite des quiz).

---

## 11. Fonctionnalités détaillées

### 11.1 Utilisateurs et sécurité

| Fonctionnalité | Jalon | Détail |
|----------------|-------|--------|
| Inscription | MVP | Email + mot de passe ; politique : ≥ 12 caractères, 3 classes de caractères ; inscription ouverte désactivable par variable d'environnement |
| Connexion | MVP | JWT **HS256** access (15 min) + refresh token rotatif (7 j, stocké hashé en base, cookie `HttpOnly; Secure; SameSite=Lax`) |
| Déconnexion | MVP | Révocation du refresh token |
| Récupération de mot de passe | MVP | Token à usage unique (1 h) ; envoi email si SMTP configuré, sinon lien affiché côté admin (mode homelab) |
| Rôles | MVP | `student`, `admin` ; `teacher` en v0.2 |
| Permissions | MVP | Matrice en §29.2 |
| 2FA TOTP | v1.0 | Optionnel par compte |
| Validation des entrées | MVP | Schémas Zod côté backend (DTO NestJS) et côté frontend |
| Hachage mots de passe | MVP | Argon2id (paramètres : m=64 Mio, t=3, p=4) ; bcrypt acceptable en repli |
| Protections | MVP | Voir §30 (XSS, CSRF, injection, rate limiting) |
| Export données | MVP | Archive JSON (profil, progression, tentatives) |
| Suppression compte | MVP | Anonymisation ou suppression en cascade selon §44 |

### 11.2 Cours et contenu pédagogique

- Hiérarchie : **Année (track) → Module → Leçon → Quiz / Labs associés**.
- Chaque leçon : objectifs pédagogiques, prérequis, durée estimée, difficulté (1–5), corps Markdown (titres, blocs de code avec coloration, images, liens), critères de réussite.
- Chaque quiz : 5–20 questions QCM (une ou plusieurs bonnes réponses), seuil de réussite (défaut 80 %), explications par question.
- Compétences du référentiel BTS SIO rattachées aux modules (table de correspondance) pour la couverture E5/E6.
- Versionnement : chaque fichier contient `version` et `last_reviewed` ; le hash Git est stocké à la synchronisation.

### 11.3 Dashboard

- Progression par année (barre globale) et par module (cartes avec % : leçons lues, quiz réussis, labs réussis).
- Liste « Reprendre où j'en étais » (dernières activités).
- Scores moyens aux quiz, temps d'apprentissage cumulé (mesuré par heartbeat côté client, fenêtre d'inactivité 5 min).
- Recommandations simples (règles, pas d'IA en MVP) : module entamé non terminé, quiz échoué à retenter, lab non fait sur module validé.
- Historique d'activité (30 derniers événements).
- Badges (v0.2).
- Accessibilité : contrastes AA, navigation clavier ; responsive (grille adaptative).

### 11.4 Labs pratiques

Voir §26 pour le fonctionnement complet et §27 pour Proxmox.

### 11.5 Scénarios de panne

Voir §26.7 pour la liste et le gabarit détaillé.

### 11.6 Chatbot IA

Voir §28. Jalon v0.2. Deux modes : Ollama local (défaut) ou API distante (D-16).

### 11.7 Administration

- Synchronisation du contenu (bouton + CLI).
- Gestion des utilisateurs (liste, changement de rôle, désactivation, réinitialisation de mot de passe).
- Consultation des journaux d'audit (paginée, filtrable).
- État de santé (version, base, conteneurs de validation disponibles).

---

## 12. Règles métier

| ID | Règle |
|----|-------|
| RM-01 | Un quiz est « réussi » si score ≥ seuil du quiz (défaut 80 %). Les tentatives sont illimitées et toutes historisées. |
| RM-02 | Une leçon est « terminée » quand l'utilisateur la marque comme lue ET a défilé jusqu'en bas (événement client) ; la marque manuelle seule suffit en mode dégradé. |
| RM-03 | Un module est « validé » si toutes ses leçons sont terminées ET son quiz est réussi. |
| RM-04 | Un lab est « réussi » si tous les contrôles obligatoires du validateur passent. Les contrôles optionnels donnent des points bonus. |
| RM-05 | Utiliser un indice réduit le score du lab (barème défini dans le YAML du lab, ex. : −10 % par indice, plancher 50 %). |
| RM-06 | La progression est individuelle et non régressive : un quiz réussi reste réussi même si une tentative ultérieure échoue (on conserve le meilleur score + l'historique complet). |
| RM-07 | Un compte désactivé ne peut plus s'authentifier ; ses données sont conservées jusqu'à suppression explicite. |
| RM-08 | Le contenu publié provient exclusivement de la branche Git configurée (défaut `main`) ; toute modification passe par commit, pas par l'interface. |
| RM-09 | Les labs de niveau ≥ 3 ont une durée de vie maximale (TTL) ; à expiration, les ressources sont détruites automatiquement. |
| RM-10 | Un scénario de panne en mode guidé est « réussi » si le diagnostic (≥ 70 %) et la remédiation (QCM exact) sont corrects. |
| RM-11 | Le chatbot ne doit jamais produire de solution complète à un lab en cours : la consigne système l'interdit et la réponse est filtrée (heuristique de détection de commandes complètes du validateur). |
| RM-12 | Toute action d'administration est journalisée en audit (qui, quoi, quand, sur qui). |
| RM-13 | **Aucun fichier source ne dépasse 400 lignes (cible 200–400). Tout dépassement déclenche un découpage par responsabilité avant merge (D-13).** |

---

## 13. Architecture logique

```mermaid
flowchart TB
    subgraph Client
        UI[Next.js App<br/>React + TypeScript + Tailwind<br/>+ xterm.js v0.2]
    end

    subgraph Serveur d'application
        API[NestJS API<br/>REST /api/v1 + WebSocket v0.2]
        AUTH[Module Auth<br/>JWT HS256 + Argon2id]
        CONTENT[Module Contenu<br/>lecture index + fichiers]
        QUIZ[Module Quiz<br/>correction + scores]
        PROG[Module Progression]
        LAB[Module Labs<br/>orchestration + validation]
        TERM[Module Terminal<br/>passerelle WS → docker exec — v0.2]
        AI[Module IA<br/>interface AiProvider — v0.2]
        ADMIN[Module Admin<br/>sync + users + audit]
    end

    subgraph Données
        PG[(PostgreSQL 16<br/>index + progression)]
        FS[(Volume contenu Git<br/>Markdown/YAML)]
        REDIS[(Redis — v0.2<br/>files + cache)]
    end

    subgraph Exécution labs
        RUNNER[Conteneurs jetables<br/>validateurs]
        PVE[Proxmox VE — v1.0<br/>VM Debian de labs]
    end

    subgraph Externe ou local
        LLM[Fournisseur IA<br/>Ollama local ou API distante]
    end

    UI -->|HTTPS| API
    API --> AUTH & CONTENT & QUIZ & PROG & LAB & ADMIN
    API -. v0.2 .-> TERM & AI
    AUTH & QUIZ & PROG & ADMIN --> PG
    CONTENT --> FS
    CONTENT --> PG
    LAB --> RUNNER
    LAB -. v1.0 .-> PVE
    AI -. v0.2 .-> LLM
    LAB -. v0.2 .-> REDIS
```

**Principes** :

- Monolithe modulaire NestJS (pas de micro-services : un seul déploiement, modules internes découplés par interfaces).
- Le module IA est un module NestJS interne ; l'extraction vers un service Python/FastAPI n'est envisagée qu'en expérimental (D-04).
- Les validateurs de labs s'exécutent hors du processus API (conteneurs jetables), jamais dans le conteneur backend.

---

## 14. Architecture physique

### 14.1 MVP (homelab)

```mermaid
flowchart TB
    subgraph Hôte Proxmox — 16 Go RAM / 500 Go
        subgraph VM/LXC « opensio » (Docker) — 2 vCPU / 4 Go
            CADDY[Caddy<br/>reverse proxy + TLS interne]
            WEB[conteneur web<br/>Next.js standalone]
            APIc[conteneur api<br/>NestJS]
            DB[conteneur db<br/>PostgreSQL 16]
            VOL1[(volume pgdata)]
            VOL2[(volume content — clone Git)]
        end
        PVE[Proxmox VE API<br/>réservé v1.0 — labs Debian]
    end
    USER[Navigateur étudiant<br/>LAN ou VPN WireGuard] -->|HTTPS| CADDY
    CADDY --> WEB
    CADDY --> APIc
    APIc --> DB
    APIc --> VOL2
    APIc -. v1.0, réseau d'administration uniquement .-> PVE
```

### 14.2 Réseaux Docker

| Réseau | Type | Membres | Exposition |
|--------|------|---------|-----------|
| `edge` | bridge | caddy, web, api | Caddy publie 443 |
| `backend` | bridge interne | api, db | Aucune publication ; PostgreSQL inaccessible depuis l'extérieur |
| `lab-runner` | bridge interne, `--internal` (v0.2+) | api (docker socket proxy), conteneurs validateurs | Aucun accès Internet sortant par défaut |

---

## 15. Flux réseau

| # | Source | Destination | Protocole/Port | Objet | Jalon |
|---|--------|-------------|----------------|-------|-------|
| F1 | Navigateur | Caddy | HTTPS/443 | Toutes les requêtes (web + `/api`) | MVP |
| F2 | Caddy | web | HTTP/3000 | Pages Next.js (SSR) | MVP |
| F3 | Caddy | api | HTTP/4000 | API REST sous `/api/v1` | MVP |
| F3b | Navigateur | api (via Caddy) | WSS/443 → 4000 | Terminal web des labs (`/ws/terminal`) | v0.2 |
| F4 | api | db | PostgreSQL/5432 | Requêtes SQL via Prisma | MVP |
| F5 | api | docker socket proxy | TCP/2375 (local) | Création de conteneurs validateurs et de session | v0.2 (niveau 2 en MVP via job synchrone isolé, voir §26.5) |
| F6 | api | Proxmox | HTTPS/8006 | API PVE (liste blanche) | v1.0 |
| F6b | Navigateur | api (via Caddy) | WSS → websockify | Console noVNC des VM de labs | v1.0 |
| F7 | api | Fournisseur IA | HTTP local/11434 (Ollama) ou HTTPS/443 (distant) | Chatbot | v0.2 |
| F8 | api | Redis | TCP/6379 | Files de tâches, cache | v0.2 |
| F9 | Cron hôte | volume content | Git pull | Synchronisation du contenu | MVP |
| F10 | hôte | PC Windows de l'auteur | SSH/rclone | Copie des sauvegardes chiffrées (§32) | MVP |

**Règles** : F4–F6 et F8 ne quittent jamais l'hôte. F6 est limité au réseau de gestion Proxmox. F7 n'est externe que si le mode API distante est explicitement activé ; en mode Ollama, tout reste local. F10 est sortant mais reste dans le périmètre personnel de l'auteur.

---

## 16. Flux de données

### 16.1 Synchronisation du contenu (MVP)

```mermaid
sequenceDiagram
    participant A as Admin/CI
    participant S as Script sync (CLI NestJS)
    participant F as Fichiers Git (Markdown/YAML)
    participant D as PostgreSQL

    A->>S: pnpm content:sync
    S->>F: Parcours content/**, parse front matter
    F-->>S: Leçons, modules, quiz, labs + hash Git
    S->>S: Validation schéma (Zod) de chaque fichier
    alt Fichier invalide
        S-->>A: Erreur détaillée (fichier, ligne, champ) ; sync interrompue
    else Tout valide
        S->>D: Upsert tracks/modules/lessons/quizzes/labs (par slug)
        S->>D: Marque obsolètes les entrées absentes des fichiers
        S-->>A: Rapport (créés/maj/supprimés)
    end
```

### 16.2 Validation d'un lab niveau 2 (MVP)

1. Le client envoie les fichiers édités (`POST /labs/:id/sessions/:sid/validate`).
2. L'API écrit les fichiers dans un répertoire temporaire unique (`/tmp/lab-<uuid>`).
3. L'API lance un conteneur jetable (image `opensio/validator-<type>`) avec : montage en lecture seule du répertoire, `--network none`, `--memory 128m --cpus 0.5`, timeout 30 s.
4. Le validateur écrit un verdict JSON sur stdout (`{ "passed": bool, "checks": [...] }`).
5. L'API enregistre le résultat, détruit le conteneur et le répertoire, renvoie le verdict.

### 16.3 Terminal web d'un lab niveau 3 (v0.2, D-14)

1. Le client ouvre `wss://opensio.home.lan/api/v1/ws/terminal?sessionId=<uuid>` avec le token d'accès.
2. La passerelle NestJS vérifie : token valide, session de lab `running`, propriétaire = utilisateur du token.
3. La passerelle exécute `docker exec -it <conteneur-de-session> /bin/bash` via le socket proxy et relaie les flux (stdin/stdout/resize).
4. Déconnexion client ou expiration TTL → fermeture propre ; le conteneur est détruit par le cycle de vie du lab (jamais par la seule fermeture du terminal).

### 16.4 Progression

Chaque action significative émet un événement `activity_events` (leçon ouverte, leçon terminée, quiz tenté, lab validé…). Le dashboard agrège ces événements + tables de progression.

---

## 17. Stack technique comparée

### 17.1 Frontend

| Candidat | Pour | Contre | Verdict |
|----------|------|--------|---------|
| **Next.js 15 (App Router) + React 19 + TypeScript** | SSR/SSG utile pour le contenu, écosystème riche, une seule base TS avec le backend | Courbe d'apprentissage App Router | **Retenu** |
| Vite + React SPA | Plus simple | SEO/partage de liens de leçons moins bon, double logique de rendu | Écarté |
| Nuxt (Vue) | Excellent aussi | Compétences de l'auteur orientées React | Écarté |

Compléments retenus : **Tailwind CSS 4** + composants accessibles **Radix UI** (primitives) ; **shadcn/ui** comme point de départ de composants ; **TanStack Query** pour les appels API ; **react-hook-form + Zod** pour les formulaires ; **CodeMirror 6** pour l'éditeur de fichiers des labs ; **xterm.js** pour le terminal web (v0.2) ; **react-markdown + rehype/remark + Shiki** pour le rendu des leçons ; **Recharts** pour les graphiques du dashboard.

### 17.2 Backend

| Candidat | Pour | Contre | Verdict |
|----------|------|--------|---------|
| **NestJS 11 (TypeScript)** | Architecture modulaire, DI, guards/interceptors, OpenAPI, même langage que le front, gateway WebSocket native (utile pour D-14) | Plus verbeux qu'Express | **Retenu** |
| Fastify brut | Performant | Tout à construire (auth, validation, doc) | Écarté |
| Django/DRF | Admin inclus | Second langage à maintenir côté API ; Python réservé aux validateurs | Écarté |

### 17.3 Base de données et ORM

| Candidat | Verdict | Justification |
|----------|---------|---------------|
| **PostgreSQL 16** | **Retenu** | Relationnel adapté au modèle, `tsvector` pour la recherche (v0.2), JSONB pour les réponses de quiz |
| MongoDB | Refusé | Doublon sans justification (relations fortes partout) |
| SQLite | Refusé | Concurrence insuffisante dès les labs |
| **Prisma 6** | **Retenu** | Typage TS de bout en bout, migrations simples |
| Drizzle | Alternative acceptable | À considérer si Prisma devient un frein ; non retenu par défaut |

### 17.4 Cache / files de tâches

| Candidat | Verdict |
|----------|---------|
| **Redis 7 + BullMQ** | **Retenu en v0.2** (files de validation de labs, cache catalogue, rate limiting) |
| Sans Redis (jobs synchrones) | **Retenu en MVP** : la validation niveau 2 est synchrone avec timeout ; acceptable à faible charge |

### 17.5 Reverse proxy — décision confirmée (D-06)

| Candidat | Pour | Contre | Verdict |
|----------|------|--------|---------|
| **Caddy 2** | **TLS interne natif** (CA locale gérée automatiquement, idéal sans domaine réel), configuration en ~10 lignes, HTTPS automatique si un domaine réel arrive un jour, nouveauté valorisante pour l'auteur | Moins connu des jurys que Nginx | **Retenu — confirmé par le commanditaire** |
| Nginx | Standard industrie, déjà pratiqué par l'auteur | TLS interne manuel (mkcert à gérer et distribuer), configuration plus verbeuse | Conservé en annexe B comme preuve de veille comparative |

### 17.6 Terminal web (v0.2) — décision confirmée (D-14)

| Candidat | Pour | Contre | Verdict |
|----------|------|--------|---------|
| **xterm.js + gateway WebSocket NestJS (`docker exec`)** | Intégration native à l'auth et aux sessions de lab, aucun processus tiers par session, réutilise la matrice de permissions | Développement de la passerelle (modéré) | **Retenu — confirmé** |
| ttyd (sidecar par conteneur) | Quasi zéro développement | Un processus exposé par session, authentification à bricoler, cycle de vie à synchroniser | Solution de repli documentée |
| Wetty | Simple | Même problème d'intégration auth/session que ttyd | Écarté |

### 17.7 Contenu

- **Markdown (CommonMark + GFM)** pour les leçons, **YAML** pour les métadonnées et définitions de quiz/labs.
- **Zod** valide chaque fichier à la synchronisation (contrat strict, erreurs localisées).

### 17.8 Tests

| Couche | Outil | Jalon |
|--------|-------|-------|
| Unitaires backend | **Vitest** | MVP |
| Unitaires frontend | Vitest + Testing Library | MVP |
| API / intégration | Vitest + Testcontainers (PostgreSQL) | MVP (sur modules auth/quiz) |
| E2E | **Playwright** | v0.2 |
| Charge | k6 (script simple sur endpoints publics) | v1.0 |

### 17.9 CI/CD

**GitHub Actions** : lint (ESLint + Prettier), typecheck, tests unitaires, tests d'intégration, build des images Docker, **vérification de la convention D-13 (taille des fichiers)**, scan d'images (Trivy, v0.2), publication GHCR (v0.2). Pas de déploiement automatique en MVP : déploiement manuel via `docker compose pull && up -d` (ou webhook watchtower, `À VALIDER`).

### 17.10 Monitoring et sécurité

| Besoin | MVP | v1.0 |
|--------|-----|------|
| Santé | Endpoint `/health` + logs structurés | Prometheus + Grafana + node_exporter |
| Sécurité hôte | fail2ban + UFW + mises à jour unattended | Wazuh (démo) |
| Métriques applicatives | Compteurs en base (événements) | Endpoint `/metrics` Prometheus |

---

## 18. Décisions d'architecture

| ID | Décision | Statut | Justification | Compromis accepté |
|----|----------|--------|---------------|-------------------|
| D-01 | Monolithe modulaire NestJS | **Confirmé** | Simplicité de déploiement et de test ; un étudiant seul ne gère pas des micro-services | Refactorisation nécessaire si extraction future |
| D-02 | Contenu dans Git, index en PostgreSQL | **Confirmé** | Versionnement natif, revue par PR, pas de CMS à construire | Nécessite une étape de synchronisation explicite |
| D-03 | PostgreSQL seul SGBD | **Confirmé** | Couvre relationnel + recherche + JSONB | Pas de spécialisation NoSQL (inutile ici) |
| D-04 | IA = module NestJS interne avec interface `AiProvider` | **Confirmé** | Évite le double backend ; FastAPI séparé seulement si RAG lourd (expérimental) | Le service Python n'est pas construit tant que le besoin n'est pas prouvé |
| D-05 | Redis absent du MVP | **Confirmé** | Validation synchrone suffisante à 1 utilisateur | Latence de validation (≤ 30 s) assumée en MVP |
| D-06 | **Caddy comme reverse proxy** | **Confirmé (commanditaire)** | TLS interne natif sans domaine réel, config minimale, découverte d'un nouvel outil pour l'auteur | Nginx documenté en annexe B à titre comparatif |
| D-07 | Labs en 4 niveaux progressifs | **Confirmé** | Évite de démarrer par l'orchestration Proxmox (risque maximal) | Les scénarios réseau complexes attendent la v1.0 |
| D-08 | Mode simulation Proxmox obligatoire | **Confirmé** | Développement et tests sans hôte PVE | Effort d'écriture d'un faux fournisseur (faible) |
| D-09 | **JWT HS256** (secret ≥ 64 octets) + refresh rotatif en cookie HttpOnly | **Confirmé (commanditaire)** | Mono-instance : la signature asymétrique (RS256) n'apporte rien sans services tiers vérificateurs ; HS256 = simplicité sans perte de sécurité ici | Si un jour un second service doit vérifier les jetons → migration RS256 documentée en ADR |
| D-10 | Pas d'exposition Internet ; accès LAN/VPN | **Confirmé** | Réduit drastiquement la surface d'attaque | Démo externe nécessite un partage VPN ou une session locale |
| D-11 | Validateurs en conteneurs `--network none`, ressources plafonnées | **Confirmé** | Isolation des scripts de vérification | Certains labs réseau devront attendre le niveau 3/4 |
| D-12 | 2FA reporté en v1.0 | **Confirmé** | Non critique en LAN/VPN mono-admin | Compte admin protégé par mot de passe fort + rate limiting |
| D-13 | **Convention de taille de fichiers : 200–400 lignes max par fichier source** | **Confirmé (commanditaire)** | Facilite l'analyse et la manipulation du code par des agents IA ; force un découpage par responsabilité | Plus de fichiers à naviguer ; conventions de nommage strictes en contrepartie (§19.2) |
| D-14 | **Terminal web = xterm.js + gateway WebSocket NestJS (`docker exec`)** | **Confirmé (commanditaire)** | Intégration auth/session native, pas de processus tiers ; cohérent avec la direction du projet | Développement de la passerelle en v0.2 ; ttyd en repli documenté |
| D-15 | **Console VM = noVNC proxifiée (websockify + tickets à durée limitée)** | **Confirmé (commanditaire)** | Accès graphique réel aux VM de labs, sécurisé par le backend (jamais d'exposition directe de VNC) | Complexité v1.0 ; tickets émis uniquement pour une session `running` |
| D-16 | **IA double mode : Ollama local (défaut) + API distante (option)** | **Confirmé (commanditaire)** | 0 € et confidentialité totale en local ; flexibilité distante ; un seul provider `OpenAiCompatible` couvre les deux | Qualité des réponses dépend du modèle local choisi (RAM de l'hôte : modèles ≤ 8B recommandés, à faire tourner de préférence sur le PC de dev plutôt que sur la VM plateforme) |
| D-17 | **Nom : OpenSIO ; domaine interne : `opensio.home.lan` ; TLS : CA interne Caddy** | **Confirmé (commanditaire)** | Pas de domaine réel ; la CA interne de Caddy évite toute gestion manuelle de certificats ; `.home.lan` évite les conflits mDNS de `.local` | La CA racine Caddy doit être approuvée une fois sur chaque machine cliente (procédure en §38) |
| D-18 | **Sauvegarde sans support externe dédié** | **Confirmé (commanditaire)** | Aucun NAS/cloud disponible : stratégie adaptée en §32 (hôte + PC Windows + GitHub) | Risque résiduel de perte en cas de sinistre simultané hôte + PC — assumé et documenté (§49) |

---

## 19. Structure du dépôt et conventions de code

### 19.1 Structure (monorepo **pnpm workspaces** + **Turborepo**)

```
opensio/
├── apps/
│   ├── web/                      # Next.js 15 (App Router)
│   │   ├── app/                  # routes (dashboard, cours, labs, admin, auth)
│   │   ├── components/           # UI découpée par composant (D-13)
│   │   │   ├── ui/               # primitives shadcn/ui
│   │   │   ├── dashboard/        # un fichier par carte/widget
│   │   │   ├── lessons/          # rendu markdown, toc, progress
│   │   │   └── labs/             # éditeur, terminal, verdict
│   │   ├── lib/                  # client API, hooks, utils (un fichier par domaine)
│   │   ├── styles/               # CSS découpé : base.css, tokens.css, par page/feature
│   │   └── package.json
│   └── api/                      # NestJS 11
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/         # un fichier par responsabilité : controller, service,
│       │   │   │                 #   jwt.strategy, refresh.service, guards/, dto/
│       │   │   ├── users/
│       │   │   ├── content/      # catalogue + sync (sync découpé : parser, validator, writer)
│       │   │   ├── quizzes/
│       │   │   ├── progress/
│       │   │   ├── dashboard/
│       │   │   ├── labs/         # sessions/, runners/, validators/, terminal/ (v0.2)
│       │   │   ├── ai/           # AiProvider + providers/ (v0.2)
│       │   │   ├── proxmox/      # ProxmoxProvider + simulation (v1.0)
│       │   │   ├── admin/
│       │   │   └── audit/
│       │   ├── common/           # guards, interceptors, filtres, pipes (un fichier chacun)
│       │   ├── config/           # validation env (Zod), un fichier par groupe de variables
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma     # si > 400 lignes : découpage via fichiers .prisma partiels
│       │   └── migrations/
│       └── package.json
├── packages/
│   ├── content-schema/           # schémas Zod : lesson.ts, module.ts, quiz.ts, lab.ts (1 schéma = 1 fichier)
│   ├── types/                    # DTO partagés web/api (un fichier par domaine)
│   └── config/                   # eslint, tsconfig, tailwind partagés
├── content/                      # SOURCE DE VÉRITÉ pédagogique
│   ├── tracks/
│   │   ├── annee-1/
│   │   │   ├── track.yaml
│   │   │   └── modules/
│   │   │       └── reseaux-fondamentaux/
│   │   │           ├── module.yaml
│   │   │           ├── lessons/
│   │   │           │   └── 01-adressage-ipv4.md
│   │   │           ├── quizzes/
│   │   │           │   └── quiz-adressage.yaml
│   │   │           └── labs/
│   │   │               └── lab-plan-adressage/
│   │   │                   ├── lab.yaml
│   │   │                   ├── files/          # fichiers de départ
│   │   │                   └── validator/      # script de validation
│   │   └── annee-2/
│   └── scenarios/
│       └── dhcp-indisponible.yaml
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml        # MVP
│   │   ├── docker-compose.dev.yml
│   │   ├── Caddyfile
│   │   └── validators/               # Dockerfiles des images de validation
│   ├── ansible/                      # v1.0
│   └── monitoring/                   # v1.0 (prometheus.yml, dashboards)
├── docs/
│   ├── architecture/                 # ADR (une décision = un fichier)
│   ├── runbooks/                     # sauvegarde, restauration, incident
│   └── rapport-bts/                  # supports de soutenance
├── scripts/
│   └── check-file-size.mjs           # contrôle D-13 (CI)
├── .github/workflows/                # CI
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
├── README.md
├── CONTRIBUTING.md
└── LICENSE                           # MIT
```

### 19.2 Conventions de code (D-13 / RM-13)

- **Taille** : 200–400 lignes par fichier source. Au-delà de 400 lignes, découpage obligatoire avant merge. La CI exécute `scripts/check-file-size.mjs` qui échoue si un fichier `*.ts`, `*.tsx`, `*.css`, `*.prisma` dépasse 400 lignes (exceptions listées explicitement : migrations Prisma générées, fichiers de lock).
- **Découpage CSS** : pas de feuille monolithique. `styles/` contient `tokens.css` (variables), `base.css` (reset/typographie), puis un fichier par feature (`dashboard.css`, `labs.css`, `lessons.css`…). Avec Tailwind, l'essentiel du style vit dans les classes utilitaires ; le CSS custom reste minimal et découpé.
- **Découpage backend** : un module NestJS = un dossier ; controller, service, DTO, guards et tests dans des fichiers séparés ; un service qui dépasse la limite est éclaté par cas d'usage (ex. `quiz-scoring.service.ts`, `quiz-attempts.service.ts`).
- **Découpage frontend** : un composant = un fichier ; les pages App Router délèguent aux composants de `components/<feature>/`.
- **Nommage** : kebab-case pour les fichiers (`quiz-scoring.service.ts`), slugs de contenu en kebab-case, composants React en PascalCase dans des fichiers kebab-case.
- **Contenu** : une leçon longue reste un seul `.md` (exception documentée à RM-13 : le Markdown pédagogique n'est pas du code source ; cible indicative ≤ 800 lignes, au-delà découper en deux leçons).

---

## 20. Modèle de données

Conventions : identifiants `uuid`, horodatages `timestamptz`, slugs uniques en `citext` (insensible à la casse). Les entités de **contenu** (tracks, modules, lessons, quizzes, labs) sont alimentées exclusivement par la synchronisation Git (§16.1) ; leur clé métier est le `slug`.

### 20.1 Tables principales

**users** : `id`, `email` (unique), `password_hash`, `display_name`, `role` (`student|teacher|admin`), `status` (`active|disabled`), `created_at`, `updated_at`, `last_login_at`, `deleted_at` (soft delete RGPD).

**refresh_tokens** : `id`, `user_id` FK, `token_hash`, `expires_at`, `created_at`, `revoked_at`, `replaced_by_id` (rotation), `user_agent`, `ip`.

**password_reset_tokens** : `id`, `user_id` FK, `token_hash`, `expires_at`, `used_at`.

**tracks** (années) : `id`, `slug` unique (`annee-1`), `title`, `description`, `position`, `git_hash`, `synced_at`.

**modules** : `id`, `track_id` FK, `slug`, `title`, `description`, `position`, `difficulty` (1–5), `estimated_minutes`, `competency_refs` (JSONB : codes du référentiel, ex. `["B2.1","B3.2"]`), `git_hash`.

**lessons** : `id`, `module_id` FK, `slug`, `title`, `objectives` (JSONB), `prerequisites` (JSONB de slugs), `difficulty`, `estimated_minutes`, `content_path` (chemin du `.md`), `success_criteria` (JSONB), `position`, `git_hash`.

**quizzes** : `id`, `module_id` FK, `slug`, `title`, `passing_score` (%), `position`.

**quiz_questions** : `id`, `quiz_id` FK, `kind` (`single|multiple`), `prompt` (Markdown), `choices` (JSONB `[{id, text}]`), `correct_choice_ids` (JSONB), `explanation` (Markdown), `position`.

**quiz_attempts** : `id`, `user_id` FK, `quiz_id` FK, `answers` (JSONB `{question_id: [choice_ids]}`), `score` (%), `passed` (bool), `started_at`, `completed_at`.

**lesson_progress** : `user_id` + `lesson_id` (PK composite), `status` (`started|completed`), `time_spent_seconds`, `completed_at`, `updated_at`.

**labs** : `id`, `module_id` FK (nullable pour les scénarios transverses), `slug`, `title`, `level` (`1_theory|2_files|3_container|4_vm`), `definition_path` (YAML), `max_score`, `estimated_minutes`, `git_hash`.

**lab_sessions** : `id`, `lab_id` FK, `user_id` FK, `status` (`running|passed|failed|expired|cleaned`), `score`, `hints_used`, `started_at`, `expires_at`, `completed_at`, `runtime_ref` (JSONB : id conteneur/VM, réseau), `last_result` (JSONB verdict).

**lab_events** : `id`, `session_id` FK, `kind` (`started|file_saved|validation_run|hint_used|terminal_opened|passed|failed|expired|cleanup`), `payload` (JSONB), `created_at`.

**activity_events** : `id`, `user_id` FK, `kind`, `entity_type`, `entity_id`, `metadata` (JSONB), `created_at`.

**audit_logs** : `id`, `actor_id` FK users, `action`, `target_type`, `target_id`, `metadata` (JSONB), `ip`, `created_at`.

### 20.2 Tables v0.2+

**badges** : `id`, `slug`, `name`, `description`, `rule` (JSONB). **user_badges** : `user_id`, `badge_id`, `earned_at`.

**chat_conversations** : `id`, `user_id` FK, `title`, `created_at`. **chat_messages** : `id`, `conversation_id` FK, `role` (`user|assistant|system`), `content`, `tokens_used`, `created_at`.

**notifications** (v1.0) : `id`, `user_id`, `kind`, `payload`, `read_at`, `created_at`.

---

## 21. Schéma relationnel textuel

```
users 1───n refresh_tokens
users 1───n password_reset_tokens
users 1───n quiz_attempts
users 1───n lesson_progress
users 1───n lab_sessions
users 1───n activity_events
users 1───n audit_logs          (actor)
users 1───n chat_conversations 1───n chat_messages      [v0.2]
users n───n badges               (via user_badges)      [v0.2]

tracks 1───n modules
modules 1───n lessons
modules 1───n quizzes 1───n quiz_questions
modules 1───n labs
lessons n───n labs               (via lesson_labs : ordre et caractère obligatoire)

labs 1───n lab_sessions 1───n lab_events
quizzes 1───n quiz_attempts
lessons 1───n lesson_progress
```

Index minimaux : `quiz_attempts(user_id, quiz_id)`, `lesson_progress(user_id)`, `lab_sessions(user_id, status)`, `activity_events(user_id, created_at DESC)`, `lab_events(session_id, created_at)`, `refresh_tokens(token_hash)`.

---

## 22. API et endpoints

Base : `/api/v1`. Réponses JSON ; erreurs au format RFC 7807 (`application/problem+json`). Pagination : `?page=&pageSize=` (défaut 20, max 100). Authentification : cookie refresh + en-tête `Authorization: Bearer <access>`.

### 22.1 Auth

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| POST | `/auth/register` | Inscription (désactivable par env) | public |
| POST | `/auth/login` | Connexion → access token + cookie refresh | public, rate-limité (5/min/IP) |
| POST | `/auth/refresh` | Rotation du refresh token | cookie |
| POST | `/auth/logout` | Révocation | authentifié |
| POST | `/auth/forgot-password` | Demande de réinitialisation | public, rate-limité |
| POST | `/auth/reset-password` | Réinitialisation avec token | public |
| GET | `/auth/me` | Profil courant | authentifié |

### 22.2 Contenu (lecture)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/tracks` | Années avec progression agrégée de l'utilisateur |
| GET | `/tracks/:slug/modules` | Modules d'une année + état de progression |
| GET | `/modules/:slug` | Détail module (leçons, quiz, labs, prérequis) |
| GET | `/lessons/:slug` | Contenu complet d'une leçon (Markdown rendu côté client) |
| GET | `/search?q=` | Recherche plein texte (v0.2) |

### 22.3 Quiz

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/quizzes/:slug` | Questions SANS les réponses correctes |
| POST | `/quizzes/:slug/attempts` | Soumettre les réponses → score, correction, explications |
| GET | `/quizzes/:slug/attempts` | Historique de mes tentatives |

### 22.4 Progression et dashboard

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/lessons/:slug/complete` | Marquer une leçon terminée |
| POST | `/lessons/:slug/heartbeat` | Cumul du temps passé (corps : `{seconds}`) |
| GET | `/me/progress` | Progression complète (par track/module) |
| GET | `/me/dashboard` | Agrégats dashboard + recommandations |
| GET | `/me/activity` | Historique d'activité paginé |
| GET | `/me/export` | Export RGPD (JSON) |
| DELETE | `/me` | Suppression/anonymisation du compte |

### 22.5 Labs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/labs/:slug` | Définition publique du lab (contexte, objectifs, fichiers de départ) |
| POST | `/labs/:slug/sessions` | Démarrer une session |
| GET | `/labs/:slug/sessions/:id` | État de la session |
| PUT | `/labs/:slug/sessions/:id/files` | Sauvegarder les fichiers édités (niveau 2) |
| POST | `/labs/:slug/sessions/:id/validate` | Lancer la validation → verdict |
| POST | `/labs/:slug/sessions/:id/hint` | Consommer l'indice suivant (RM-05) |
| POST | `/labs/:slug/sessions/:id/stop` | Arrêter et nettoyer la session |
| WS | `/ws/terminal?sessionId=` | Terminal web du lab (niveau 3+, D-14) — v0.2 |
| GET | `/labs/:slug/sessions/:id/console-ticket` | Émet un ticket noVNC à durée limitée (niveau 4, D-15) — v1.0 |

### 22.6 Chatbot (v0.2)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET/POST | `/chat/conversations` | Lister / créer |
| GET | `/chat/conversations/:id/messages` | Historique |
| POST | `/chat/conversations/:id/messages` | Envoyer un message → réponse (stream SSE optionnel) |

### 22.7 Admin

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/admin/content/sync` | Déclencher la synchronisation Git → base |
| GET | `/admin/users` | Liste paginée |
| PATCH | `/admin/users/:id` | Rôle, statut |
| POST | `/admin/users/:id/reset-password` | Générer un lien de réinitialisation |
| GET | `/admin/audit-logs` | Journal d'audit filtrable |
| GET | `/admin/system` | Santé détaillée (version, db, runners) |

### 22.8 Santé

`GET /health` (public, sans auth) : `{ "status": "ok", "version": "...", "db": "up" }`.

---

## 23. Événements et WebSocket

- **MVP** : aucun WebSocket. Le rafraîchissement du dashboard se fait par requêtes (TanStack Query, invalidation après action). La validation de lab est synchrone (attente ≤ 30 s avec état de chargement).
- **v0.2 — confirmé (D-14)** : WebSocket pour le **terminal web** des labs niveau 3 (`/ws/terminal`, gateway NestJS + `ws`, authentification par access token, vérification de propriété de la session, relais `docker exec`). SSE (Server-Sent Events) pour le streaming des réponses du chatbot.
- **v1.0 — confirmé (D-15)** : WebSocket supplémentaire pour la **console noVNC** des VM (relais vers websockify côté hôte, tickets à durée limitée émis par `console-ticket`).

Événements métier internes (bus NestJS `EventEmitter`, en processus) : `lesson.completed`, `quiz.attempted`, `lab.session.*`, `user.registered` — consommés par le module progression (mise à jour des agrégats) et audit. Pas de broker externe en MVP.

---

## 24. Formats Markdown et YAML

### 24.1 Leçon (`content/tracks/annee-1/modules/reseaux-fondamentaux/lessons/01-adressage-ipv4.md`)

```markdown
---
slug: adressage-ipv4
title: "Adressage IPv4 : classes, masques et notation CIDR"
version: 1.0.0
last_reviewed: 2026-08-24
difficulty: 2
estimated_minutes: 45
objectives:
  - "Convertir une adresse IPv4 en binaire"
  - "Calculer un masque de sous-réseau en notation CIDR"
  - "Déterminer l'adresse réseau, broadcast et la plage d'hôtes"
prerequisites: []
competency_refs: ["B2.1"]
success_criteria:
  - "Réussir le quiz 'Adressage IPv4' avec au moins 80 %"
  - "Compléter le lab 'Plan d'adressage d'une PME'"
labs:
  - slug: plan-adressage-pme
    required: true
references:
  - label: "RFC 791 — Internet Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc791"
---

# Adressage IPv4

## 1. Structure d'une adresse

Une adresse IPv4 est un nombre de 32 bits, représenté en quatre octets...

```bash
# Conversion décimal → binaire avec Python
python3 -c "print('.'.join(f'{int(octet):08b}' for octet in '192.168.1.10'.split('.')))"
```

## 2. Notation CIDR

...
```

### 24.2 Module (`module.yaml`)

```yaml
slug: reseaux-fondamentaux
title: "Réseaux : fondamentaux"
description: "Adressage, sous-réseaux, modèle OSI/TCP-IP, premiers diagnostics."
position: 1
difficulty: 2
estimated_minutes: 600
competency_refs: ["B2.1", "B2.2"]
lessons:
  - adressage-ipv4
  - sous-reseaux-et-vlsm
  - modeles-osi-tcpip
quizzes:
  - quiz-adressage
labs:
  - plan-adressage-pme
```

### 24.3 Quiz (`quiz-adressage.yaml`)

```yaml
slug: quiz-adressage
title: "Quiz — Adressage IPv4"
passing_score: 80
questions:
  - kind: single
    prompt: "Quelle est l'adresse réseau de 192.168.1.77/26 ?"
    choices:
      - { id: a, text: "192.168.1.0" }
      - { id: b, text: "192.168.1.64" }
      - { id: c, text: "192.168.1.72" }
      - { id: d, text: "192.168.1.76" }
    correct: [b]
    explanation: "Un /26 découpe en blocs de 64. 77 ∈ [64, 127], donc le réseau est 192.168.1.64."
```

### 24.4 Lab (`lab.yaml`)

```yaml
slug: plan-adressage-pme
title: "Plan d'adressage d'une PME"
level: 2_files
max_score: 100
estimated_minutes: 40
context: |
  Une PME de 3 services (Compta 10 postes, Prod 50 postes, Invités 20 postes)
  dispose du réseau 10.20.0.0/24. Vous devez produire le plan d'adressage.
objectives:
  - "Découper 10.20.0.0/24 en 3 sous-réseaux adaptés (VLSM)"
  - "Documenter chaque sous-réseau (réseau, masque, plage, broadcast)"
prerequisites: ["adressage-ipv4", "sous-reseaux-et-vlsm"]
topology: null          # pas de topologie pour un lab niveau 2
files:
  editable:
    - path: plan.csv
      description: "service,network,prefix,gateway,first_host,last_host,broadcast"
hints:
  - cost_percent: 10
    text: "Commencez par le plus gros besoin (Prod, 50 postes → /26)."
  - cost_percent: 10
    text: "Invités : 20 postes → /27. Compta : 10 postes → /28."
validation:
  type: script
  image: opensio/validator-csv:latest
  timeout_seconds: 30
  checks:
    - id: subnets_valid
      required: true
      points: 60
    - id: no_overlap
      required: true
      points: 25
    - id: doc_complete
      required: false
      points: 15
scoring:
  floor_percent: 50     # RM-05 : plancher après indices
```

### 24.5 Règles de validation des fichiers

- Tout fichier de `content/` est validé par les schémas Zod de `packages/content-schema` à la synchronisation ET en CI (workflow `content-validate`).
- Un fichier invalide bloque la synchronisation complète (pas d'état partiel) et fait échouer la CI.
- Les slugs sont uniques par type, en kebab-case, stables (renommer un slug = nouvelle entité en base ; fournir un champ `redirects_from` si nécessaire).

---

## 25. Stratégie de contenu

### 25.1 Plan de contenu par priorité pédagogique

| Priorité | Thème | Année | Difficulté | Jalon plateforme |
|----------|-------|-------|-----------|------------------|
| P0 | Adressage IPv4, sous-réseaux/VLSM | 1 | 2 | MVP |
| P0 | Modèles OSI/TCP-IP, diagnostic (`ping`, `ip`, `ss`, `dig`) | 1 | 2 | MVP |
| P0 | VLAN et commutation (concepts + lecture de config) | 1 | 3 | MVP |
| P0 | Linux : administration de base, services, logs | 1 | 2 | MVP |
| P0 | DNS : principe, enregistrements, diagnostic | 1 | 2 | MVP |
| P1 | DHCP : principe, configuration, dépannage | 1 | 2 | MVP |
| P1 | Windows Server : AD DS, utilisateurs, GPO (**labs guidés/fichiers uniquement — pas de VM Windows, cf. §6**) | 1 | 3 | MVP (théorie + fichiers) |
| P1 | Virtualisation : hyperviseurs, VM, snapshots | 1 | 2 | MVP |
| P1 | Sauvegardes : stratégie 3-2-1, restauration | 1 | 2 | MVP |
| P2 | Routage statique et inter-VLAN | 1 | 3 | v0.2 (lab conteneur) |
| P2 | Pare-feu : filtrage, zones, règles | 2 | 3 | v0.2 |
| P2 | Serveurs web : Nginx/Apache, TLS | 2 | 3 | v0.2 |
| P2 | Docker : images, conteneurs, Compose | 2 | 3 | v0.2 |
| P2 | Scripting Bash/PowerShell pour l'administration | 2 | 3 | v0.2 |
| P2 | Supervision : métriques, alertes, outils | 2 | 3 | v0.2 |
| P3 | VPN : site-à-site et nomade | 2 | 4 | v1.0 (lab VM Debian : WireGuard/OpenVPN) |
| P3 | Ansible : inventaires, playbooks, rôles | 2 | 4 | v1.0 |
| P3 | Haute disponibilité : redondance, clustering (concepts) | 2 | 4 | v1.0 |
| P3 | Cybersécurité : durcissement, audit, détection | 2 | 4 | v1.0 |
| P3 | NTP, SNMP, IPv6 | 1–2 | 3 | v1.0 |
| P4 | Cloud et CI/CD (culture + mise en pratique sur le projet lui-même) | 2 | 4 | v1.0 |

### 25.2 Gouvernance du contenu

- Rédaction en français, ton clair, exemples de commandes réels et testés.
- Chaque leçon relue avec `last_reviewed` mis à jour ; revue annuelle minimale.
- Aucune copie de contenu protégé ; liens vers les sources officielles (RFC, docs Debian/Microsoft).
- Les schémas sont en Mermaid (rendu natif) ou SVG versionnés dans `content/assets/`.
- **Charte cybersécurité** : tous les scénarios sont défensifs (détection, analyse, remédiation, durcissement). Aucun scénario ne demande d'exécuter une attaque ; les artefacts offensifs éventuels (logs d'attaque) sont fournis figés.

---

## 26. Gestion des labs

### 26.1 Cycle de vie complet d'une session de lab

```mermaid
stateDiagram-v2
    [*] --> running : POST /labs/:slug/sessions
    running --> running : sauvegarde fichiers / indice / validation (échec) / terminal
    running --> passed : validation réussie
    running --> failed : abandon explicite
    running --> expired : TTL dépassé
    passed --> cleaned : nettoyage
    failed --> cleaned : nettoyage
    expired --> cleaned : nettoyage automatique
    cleaned --> [*]
```

### 26.2 Les 15 éléments constitutifs d'un lab

| # | Élément | Implémentation |
|---|---------|----------------|
| 1 | Contexte | Champ `context` (Markdown) du `lab.yaml` |
| 2 | Objectifs | Champ `objectives` |
| 3 | Prérequis | Slugs de leçons ; l'UI affiche un avertissement si non terminées (non bloquant) |
| 4 | Topologie | Mermaid/SVG dans `topology` ; obligatoire à partir du niveau 3 |
| 5 | Machines utilisées | Niveau 2 : aucune (conteneur validateur éphémère) ; niveau 3 : 1 conteneur de travail ; niveau 4 : 1–2 VM Debian clonées (quota hôte, §27.3) |
| 6 | Réseau isolé | Niveau 3 : réseau Docker `--internal` dédié à la session ; niveau 4 : bridge Proxmox isolé sans route vers le LAN |
| 7 | Étapes | Liste ordonnée dans le YAML, affichée comme checklist |
| 8 | Commandes autorisées | Niveau 2 : pas de shell (édition de fichiers uniquement) ; **niveau 3 : terminal web xterm.js via gateway WebSocket NestJS → `docker exec` dans le conteneur de session (D-14, confirmé)** ; niveau 4 : terminal web ou console noVNC (D-15) |
| 9 | Fichiers modifiables | Liste `files.editable` ; seuls ces chemins sont acceptés par l'API (validation du chemin côté backend, rejet de tout `..`) |
| 10 | Indices | Liste ordonnée avec coût (RM-05) |
| 11 | Validation automatique | Script dans conteneur jetable (§16.2) ; verdict JSON structuré |
| 12 | Score | Somme des points des contrôles réussis, minorée des indices, plancher RM-05 |
| 13 | Nettoyage | Destruction conteneur + répertoire temporaire (niveau 2/3) ; destruction VM + réseau (niveau 4) ; exécuté même en cas d'échec (finally) |
| 14 | Journalisation | `lab_events` pour chaque action (y compris `terminal_opened`) ; verdict complet conservé dans `lab_sessions.last_result` |
| 15 | Remise à zéro | Niveau 2 : nouvelle session = nouveaux fichiers de départ ; niveau 4 : rollback au snapshot initial ou re-clonage du modèle |

### 26.3 Contrat du validateur (précis, non ambigu)

- Entrée : répertoire `/work` monté en lecture seule contenant les fichiers de l'utilisateur.
- Sortie : JSON unique sur stdout, code de sortie 0 (le verdict est dans le JSON, pas dans le code de sortie) :

```json
{
  "passed": false,
  "score": 60,
  "checks": [
    { "id": "subnets_valid", "passed": true, "points": 60, "message": "Découpage VLSM correct" },
    { "id": "no_overlap", "passed": false, "points": 0, "message": "Recouvrement entre Prod et Invités" }
  ]
}
```

- Contraintes d'exécution : `--network none`, `--read-only` (sauf `/tmp`), `--memory 128m --cpus 0.5 --pids-limit 64`, utilisateur non-root, timeout dur (défaut 30 s, tué ensuite).

### 26.4 Différence entre les niveaux de labs

| Niveau | Infra | Exemple | Validation | Jalon |
|--------|-------|---------|-----------|-------|
| 1 — Théorique guidé | Aucune | Ordonner les étapes d'un diagnostic DHCP | QCM / réponses structurées | MVP |
| 2 — Fichiers | Conteneur validateur jetable | Corriger un `dhcpd.conf`, produire un plan d'adressage CSV, éditer une GPO exportée | Script sur fichiers | MVP |
| 3 — Conteneur + terminal web | 1 conteneur de travail éphémère | Réparer un serveur DNS (dnsmasq/CoreDNS) cassé | Script exécuté DANS le conteneur | v0.2 |
| 4 — VM Proxmox Debian | 1–2 VM clonées + réseau isolé | Remettre en service DHCP+DNS sur Debian | Script via agent/SSH dans les VM | v1.0 |

### 26.5 Stratégie progressive (anti-« trop ambitieux »)

1. **MVP** : niveaux 1 et 2 uniquement. Le niveau 2 utilise l'API Docker de l'hôte via un **socket proxy** (tecnativa/docker-socket-proxy) avec seuls `CONTAINERS`, `IMAGES`, `POST` autorisés. Si Docker n'est pas disponible (développement Windows), un `LabRunner` de simulation exécute les validateurs en processus local confiné (dossier temporaire, timeout) — clairement marqué « dev only ».
2. **v0.2** : niveau 3 avec file BullMQ (un worker dédié crée/détruit les conteneurs de session) + terminal web (D-14).
3. **v1.0** : niveau 4 (Proxmox, VM Debian uniquement), seulement après que les niveaux 1–3 sont stables et testés.

### 26.6 Interface d'abstraction du runner

```typescript
// Contrat précis — apps/api/src/modules/labs/runners/lab-runner.interface.ts
export interface LabRunner {
  readonly kind: 'simulation' | 'docker' | 'proxmox';
  start(session: LabSessionContext): Promise<RuntimeRef>;     // crée l'environnement
  validate(session: LabSessionContext, files?: EditedFile[]): Promise<ValidatorVerdict>;
  stop(session: LabSessionContext): Promise<void>;            // idempotent, nettoie tout
  status(session: LabSessionContext): Promise<RuntimeStatus>;
}
```

Le runner actif est choisi par configuration (`LAB_RUNNER=simulation|docker|proxmox`). Le runner Proxmox n'existe qu'en v1.0 ; demander `proxmox` avant cette version doit produire une erreur explicite au démarrage.

### 26.7 Scénarios de panne (gabarit commun)

Chaque scénario est un lab de niveau 1 (MVP) puis 3/4 (versions réelles) avec les champs : `context`, `symptoms` (tickets + logs fournis), `competency_refs`, `available_data` (commandes « jouables » en mode guidé), `expected_resolution`, `validation` (QCM de diagnostic + remédiation), `level` (1–4), `safety_notes`.

| # | Scénario | Symptômes fournis | Compétences évaluées | Résolution attendue | Niveau | Risque de dérive offensive |
|---|----------|-------------------|----------------------|---------------------|--------|---------------------------|
| S1 | DHCP indisponible | Postes en APIPA 169.254.x.x ; `systemctl status isc-dhcp-server` : failed | Diagnostic service, logs, port 67 | Relancer le service, corriger la config d'écoute, vérifier les baux | 1 (MVP) → 3 | Faible |
| S2 | DNS incorrect | `dig` renvoie NXDOMAIN ; forwarder faux dans la conf | Résolution, fichiers de zone, tests | Corriger le forwarder/l'enregistrement, vider le cache | 1 → 3 | Faible |
| S3 | VLAN/trunk mal configuré | Ping inter-VLAN KO ; sortie `show vlan` fournie | Lecture de config switch, tagging 802.1Q | Identifier le port en access au lieu de trunk, proposer la correction | 1 (MVP, guidé) | Faible |
| S4 | Route absente | Ping vers un site distant KO ; table de routage incomplète | Routage statique, passerelle | Ajouter la route, vérifier le retour | 1 → 3 | Faible |
| S5 | Certificat expiré | Alerte navigateur ; sortie `openssl s_client` | TLS, PKI, renouvellement | Renouveler (Let's Encrypt), vérifier la chaîne | 1 → 3 | Faible |
| S6 | Service web arrêté | HTTP 502 du reverse proxy ; backend down | Gestion de services, logs Nginx | Redémarrer, trouver la cause racine (port, conf) | 1 → 3 | Faible |
| S7 | Disque presque plein | Alertes ; `df -h` à 98 % ; logs volumineux | Analyse d'espace, logrotate, quotas | Purger/archiver, configurer logrotate, surveiller | 1 → 3 | Faible |
| S8 | Sauvegarde inutilisable | Restauration de test échoue ; archive corrompue | Stratégie 3-2-1, tests de restauration | Diagnostiquer, réparer la chaîne de sauvegarde, documenter | 1 (MVP) | Faible |
| S9 | Brute force SSH | `auth.log` : milliers d'échecs ; IP unique | Analyse de logs, durcissement SSH | fail2ban, clés uniquement, port non standard, rapport | 1 → 3 | **Modéré** : l'énoncé ne fournit que la DÉFENSE ; aucune consigne d'attaque, pas d'outil offensif embarqué |
| S10 | Mauvaise règle de pare-feu | Service injoignable depuis un sous-réseau ; `nft list ruleset` fourni | Filtrage, ordre des règles | Identifier la règle bloquante, proposer la règle corrective minimale | 1 → 3 | Faible |

---

## 27. Intégration Proxmox

> Jalon v1.0. Cette section définit le contrat complet afin qu'aucune décision dangereuse ne soit improvisée plus tard. En MVP et v0.2, seul le **mode simulation** existe.

### 27.1 Prérequis

- Hôte Proxmox VE ≥ 8.x (**16 Go RAM / 500 Go — confirmé H1**) accessible depuis le conteneur API sur le réseau de gestion uniquement.
- Utilisateur PVE dédié `opensio@pve` avec un **token API** (pas de mot de passe) et un rôle personnalisé limité aux permissions strictement nécessaires : `VM.Clone`, `VM.PowerMgmt`, `VM.Snapshot`, `VM.Audit`, `Datastore.AllocateSpace`, `SDN.Use` (sur la zone des labs uniquement).
- Un **pool** dédié `labs` ; le token n'a de droits que sur ce pool.
- Un bridge isolé dédié aux labs (ex. `vmbr10`, sans passerelle vers le LAN, ou zone SDN sans sortie).

### 27.2 Modèles de VM

- **Template cloud-init Debian 12 uniquement** (confirmé : hôte 16 Go → pas de VM Windows Server, cf. §6). Empreinte cible : 1 vCPU / 1 Go RAM / 8 Go disque par template.
- Variantes de templates par famille de labs : `debian-base`, `debian-dns-dhcp` (services préinstallés), `debian-web` (nginx) — tous ≤ 1 Go RAM.
- Les compétences Windows Server / AD sont couvertes par des labs niveau 1 (guidés) et niveau 2 (fichiers : scripts PowerShell validés statiquement, exports de GPO à corriger).
- Chaque template est référencé dans le `lab.yaml` par `proxmox.template_key` ; la correspondance clé → ID PVE est configurée par variable d'environnement (`PROXMOX_TEMPLATE_IDS`, JSON), jamais codée en dur dans le contenu.

### 27.3 Cycle d'orchestration et quotas (dimensionnés pour 16 Go RAM)

1. **Clonage** lié (linked clone) du template dans le pool `labs`, nommage `lab-<sessionId>`.
2. **Réseau** : attachement au bridge isolé ; aucune règle NAT sortante.
3. **Snapshot** initial `baseline` immédiat (remise à zéro rapide).
4. **Quotas (adaptés à l'hôte 16 Go)** :
   - Par VM : **1–2 vCPU / 1–2 Go RAM / 20 Go disque maximum** ;
   - Par session : **2 VM maximum** ;
   - **Global : 2 VM de lab simultanées maximum** (soit ≤ 4 Go RAM de labs, laissant ≥ 8 Go à l'hyperviseur + VM plateforme + autres services de l'auteur) ;
   - File d'attente : si le quota global est atteint, `POST /labs/:slug/sessions` renvoie `409 LAB_CAPACITY_REACHED` avec le temps d'attente estimé.
5. **TTL** : durée de vie par défaut **45 min** (ressources limitées), prolongeable une fois de 30 min ; un job planifié (toutes les 5 min) détruit les sessions expirées.
6. **Nettoyage** : arrêt → suppression des VM de la session → suppression des ressources réseau éventuelles ; exécuté dans un `finally` et par le job de balayage (rattrapage des orphelines : toute VM `lab-*` sans session active en base est détruite).
7. **Erreurs et reprises** : toute étape échouée est journalisée (`lab_events`) ; une reprise est tentée une fois ; en cas d'échec définitif, la session passe en `failed` et le nettoyage est forcé.

### 27.4 Architecture de sécurité (jamais d'API PVE au navigateur)

```mermaid
flowchart LR
    B[Navigateur] -->|POST /labs/:slug/sessions| API[Backend NestJS]
    B -->|WSS noVNC + ticket| API
    API --> WL{Liste blanche d'actions<br/>start_lab / stop_lab / reset_lab / status / console_ticket}
    WL -->|actions autorisées uniquement| PVE[API Proxmox 8006<br/>token à privilèges limités, pool labs]
    API -->|relais websockify| VNC[Console VNC de la VM]
    B -.->|JAMAIS d'accès direct| PVE
```

- Le navigateur ne connaît que les endpoints `/labs/*`. Les secrets Proxmox (`PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`) ne vivent que côté backend (variables d'environnement, jamais en base, jamais dans le code).
- La liste blanche est exhaustive : `start_lab`, `stop_lab`, `reset_lab` (rollback snapshot), `status`, `console_ticket`. Aucune action générique « exécuter » n'est exposée.
- **Console noVNC proxifiée (D-15, confirmé)** : le backend demande un ticket VNC à l'API PVE, ouvre un relais WebSocket vers websockify, et n'autorise la connexion que si la session de lab est `running` et appartient à l'utilisateur. Ticket à durée limitée (≤ 5 min, renouvelé tant que la session vit). Le port VNC de PVE n'est jamais publié au navigateur.

### 27.5 Mode simulation (obligatoire pour le développement)

`ProxmoxProvider` simulé : implémente la même interface que le fournisseur réel, retourne des états fictifs persistés en mémoire/fichier, avec délais simulés et injection d'erreurs configurable (`PROXMOX_SIMULATE_FAILURE_RATE`). Les tests d'intégration du module labs tournent intégralement en mode simulation en CI.

---

## 28. Intégration IA

> Jalon v0.2. Désactivable intégralement (`AI_ENABLED=false`) sans casser la plateforme. **Double mode confirmé (D-16) : Ollama local par défaut, API distante optionnelle.**

### 28.1 Cas d'usage et limites pédagogiques

- **Autorisé** : expliquer une notion, reformuler un objectif, donner une piste de diagnostic, expliquer un message d'erreur, quizzer l'étudiant.
- **Interdit (RM-11)** : fournir la solution complète d'un lab ou d'un quiz en cours. La consigne système l'interdit explicitement ; le contexte de la session en cours (slug du lab) est passé au fournisseur pour renforcer le refus ; une heuristique post-traitement détecte les réponses contenant la séquence exacte de commandes du validateur et les remplace par un renvoi pédagogique.

### 28.2 Architecture

```typescript
// Contrat précis — apps/api/src/modules/ai/ai-provider.interface.ts
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export interface ChatOptions { maxTokens?: number; temperature?: number; context?: { labSlug?: string; lessonSlug?: string }; }
export interface ChatResult { content: string; tokensUsed: number; provider: string; model: string; }

export interface AiProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult>;
  isAvailable(): Promise<boolean>;
}
```

Fournisseurs prévus :
- **`OpenAiCompatibleProvider` (unique, couvre les deux modes confirmés)** :
  - **Mode local (défaut)** : `AI_BASE_URL=http://<hôte-ollama>:11434/v1`, `AI_MODEL=llama3.1:8b` (ou équivalent ≤ 8B, contrainte RAM). Recommandation : faire tourner Ollama sur le PC de développement ou une VM dédiée plutôt que sur la VM plateforme (4 Go) — `À VALIDER` selon les ressources allouées.
  - **Mode distant (option)** : `AI_BASE_URL=https://api.openai.com/v1` (ou autre compatible), `AI_API_KEY` renseignée. Bandeau de confidentialité affiché côté client dans ce mode.
- `AnthropicProvider` : optionnel, même interface.
- `NullProvider` : quand `AI_ENABLED=false` (réponses 503 propres côté API, UI masquée).

Sélection par variables d'environnement : `AI_PROVIDER=openai-compatible`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` (vide en local Ollama). **Changer de mode = changer des variables d'environnement, sans toucher au code.**

### 28.3 Contexte, historique, RAG

- Historique : les 20 derniers messages de la conversation (table `chat_messages`) + consigne système pédagogique.
- Récupération documentaire (RAG léger, v0.2) : recherche plein texte PostgreSQL sur les leçons à partir du message de l'utilisateur ; les 3 extraits les plus pertinents sont injectés dans le contexte avec leurs titres. **Pas de base vectorielle en v0.2** (pgvector = expérimental).
- Coûts et confidentialité : en mode distant, les messages partent chez le fournisseur — bandeau d'information affiché à l'utilisateur ; en mode local (Ollama), rien ne sort de l'hôte. Le choix du mode est documenté dans les mentions RGPD (§44).
- Rate limiting : 20 messages/heure/utilisateur (configurable), compteur en base (Redis en v0.2).
- Secrets : `AI_API_KEY` en variable d'environnement uniquement ; jamais journalisée ; absente des réponses d'erreur.

---

## 29. Authentification et autorisation

### 29.1 Mécanisme

- Mots de passe : Argon2id (m=64 Mio, t=3, p=4). Jamais de mot de passe en clair en log, en base ou en réponse API.
- Access token JWT **HS256 (confirmé D-09)** avec secret ≥ 64 octets, durée 15 min, claims : `sub`, `role`, `iat`, `exp`.
  - *Rappel du choix* : HS256 = signature symétrique (un secret signe et vérifie). Adapté ici car un seul service émet et vérifie les jetons. RS256 (asymétrique) ne se justifie que si des services tiers doivent vérifier les jetons sans connaître le secret — cas absent de la roadmap ; si ce besoin naît, un ADR documentera la migration.
- Refresh token opaque (256 bits aléatoires), stocké **hashé** (SHA-256) en base, cookie `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`, durée 7 j, rotation à chaque usage avec détection de réutilisation (révocation de toute la chaîne).
- Récupération de mot de passe : token opaque à usage unique, 1 h, hashé en base.

### 29.2 Matrice de permissions

| Ressource / action | student | teacher (v0.2) | admin |
|--------------------|---------|----------------|-------|
| Lire le catalogue publié | ✔ | ✔ | ✔ |
| Passer quiz / labs (propres sessions) | ✔ | ✔ | ✔ |
| Terminal web / console noVNC de SES sessions | ✔ | ✔ | ✔ |
| Voir sa progression / exporter ses données | ✔ | ✔ | ✔ |
| Voir la progression des étudiants | ✘ | ✔ (agrégée) | ✔ |
| Synchroniser le contenu | ✘ | ✘ | ✔ |
| Gérer les utilisateurs | ✘ | ✘ | ✔ |
| Lire les journaux d'audit | ✘ | ✘ | ✔ |

Implémentation : guard NestJS `RolesGuard` + décorateur `@Roles()`, vérification systématique de la propriété de la ressource (`userId` du token vs ressource) dans les services — jamais seulement côté frontend.

---

## 30. Sécurité applicative

| Menace | Mesure | Jalon |
|--------|--------|-------|
| Injection SQL | Prisma (requêtes paramétrées) ; aucune requête brute sans `$queryRaw` paramétré | MVP |
| XSS | React échappe par défaut ; Markdown rendu avec `rehype-sanitize` (liste blanche de balises) ; CSP stricte (`default-src 'self'`) | MVP |
| CSRF | Cookies SameSite=Lax + token CSRF (en-tête double soumission) sur les mutations utilisant le cookie | MVP |
| Brute force auth | Rate limiting (5 connexions/min/IP, 10 inscriptions/h/IP) + verrouillage progressif + journalisation | MVP |
| Abus d'API | Rate limiting global (100 req/min/IP) et par route sensible ; body limité à 1 Mo | MVP |
| Abus WebSocket (terminal, noVNC) | Auth par access token à la connexion, vérification de propriété de session, 1 connexion terminal par session, déconnexion à l'expiration du token | v0.2/v1.0 |
| SSRF (chatbot, webhooks) | Listes blanches d'URL ; pas de fetch sur entrée utilisateur libre | v0.2 |
| Upload/path traversal (labs) | Chemins validés contre la liste `files.editable`, rejet de `..`, pas d'upload de binaire en MVP | MVP |
| Exécution de code (validateurs) | Conteneurs jetables `--network none`, non-root, ressources plafonnées, timeout (§26.3) | MVP |
| Évasion depuis le terminal web | Le `docker exec` cible uniquement le conteneur de session (réseau interne, non-root, quotas) ; jamais l'hôte ni l'API | v0.2 |
| Fuite de secrets | `.env` hors Git, validation au démarrage, scan gitleaks en CI | MVP |
| Dépendances vulnérables | `pnpm audit` + Dependabot + scan Trivy des images (v0.2) | MVP/v0.2 |
| En-têtes | helmet : HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors 'none' | MVP |

---

## 31. Sécurité infrastructure

- **Exposition** : plateforme accessible uniquement sur le LAN (`opensio.home.lan`, D-17) ou via VPN WireGuard ; aucun port-forwarding Internet (D-10). Si une démonstration externe est indispensable : accès temporaire via VPN, jamais par ouverture de port.
- **Hôte** : Debian à jour (unattended-upgrades), UFW (deny incoming, allow 443 + SSH depuis le LAN), SSH par clés uniquement, fail2ban.
- **Conteneurs** : images épinglées par version, utilisateurs non-root dans les images applicatives, volumes en lecture seule quand possible, socket Docker jamais monté directement dans l'API (socket proxy filtrant, §26.5).
- **Proxmox** : token à privilèges limités + pool dédié + réseau isolé (§27).
- **Segmentation** : réseaux Docker séparés (§14.2) ; PostgreSQL non publié.
- **TLS interne (D-17)** : CA racine gérée par Caddy (`tls internal`) ; la procédure d'approbation de la CA sur les machines clientes est documentée en §38.
- **SIEM (Wazuh/Suricata)** : explicitement **hors périmètre MVP/v0.2** — disproportionné ; la journalisation applicative + fail2ban couvrent le besoin. Démo possible en v1.0 comme contenu pédagogique, pas comme dépendance de la plateforme.

---

## 32. Sauvegarde et restauration

> **Contrainte confirmée (D-18)** : aucun support externe dédié (NAS, cloud de sauvegarde). La stratégie 3-2-1 est adaptée en « 2 copies locales + GitHub pour le contenu », avec risque résiduel assumé (§49).

| Élément | Méthode | Destination | Fréquence | Rétention |
|---------|---------|-------------|-----------|-----------|
| PostgreSQL | `pg_dump` via cron hôte, compressé, chiffré (age/gpg) | 1) volume dédié de l'hôte 2) **copie vers le PC Windows de l'auteur** (rclone/robocopy over SSH, tâche planifiée) | Quotidien | 7 quotidiens + 4 hebdomadaires |
| Contenu pédagogique | Git (dépôt distant GitHub privé) | GitHub = copie externe | À chaque push | Illimitée (historique) |
| Fichiers de sessions labs | Éphémères par conception | — | — | Aucune sauvegarde (données jetables) |
| Configuration (`.env`, Caddyfile) | Copie chiffrée jointe au dump | Idem PostgreSQL | Quotidien | 7 jours |

- **Test de restauration** : procédure écrite dans `docs/runbooks/restore.md`, exécutée et consignée au moins une fois par jalon (preuve pour le rapport BTS).
- **Amélioration future recommandée** : dès qu'un support externe devient disponible (NAS, disque USB, offre cloud gratuite), ajouter une 3ème copie externalisée — le runbook prévoit déjà le point d'extension.

---

## 33. Supervision et observabilité

- **MVP** : endpoint `/health` (db + version), logs structurés JSON (pino) avec corrélation par requête (`x-request-id`), compteurs métier en base (`activity_events`). Un simple `curl` cron + notification suffit.
- **v1.0** : endpoint `/metrics` (prom-client), Prometheus + Grafana + node_exporter dans `infra/monitoring/`, dashboards fournis en JSON versionné. Alertes : conteneur down, disque > 85 %, échecs de validation en rafale.
- Pas de stack ELK : les logs conteneurs sont lus via `docker logs` / Loki léger en v1.0 si besoin (`À VALIDER`).

---

## 34. Gestion des erreurs

- **Format** : RFC 7807 (`type`, `title`, `status`, `detail`, `instance`, `requestId`). Jamais de stack trace en production.
- **Codes métier** stables (ex. `LAB_SESSION_EXPIRED`, `LAB_CAPACITY_REACHED`, `QUIZ_ALREADY_PASSED_INFO`) dans le champ `type` pour que le frontend traduise en messages clairs.
- **Frontend** : ErrorBoundary React par route, états de chargement explicites, toasts pour les erreurs d'action, page 404/500 soignées.
- **Labs** : toute erreur d'orchestration déclenche le nettoyage (§27.3) ; l'utilisateur voit un message non technique + un identifiant de session à communiquer.
- **Retry** : uniquement sur les opérations idempotentes (lecture, status) ; jamais sur la création de session sans clé d'idempotence (`Idempotency-Key` en-tête accepté sur `POST /labs/:slug/sessions`).

---

## 35. Stratégie de tests

| Couche | Outil | Cible MVP | Exemples |
|--------|-------|-----------|----------|
| Unitaires backend | Vitest | Services auth (hash, rotation), scoring quiz, barème labs (RM-05), validation Zod des contenus | `quiz-scoring.service.spec.ts` |
| Unitaires frontend | Vitest + Testing Library | Composants dashboard, rendu Markdown, formulaires | `progress-card.spec.tsx` |
| Intégration API | Vitest + Testcontainers (PostgreSQL) | Flux auth complet, soumission de quiz, cycle de lab niveau 2 avec runner simulation | `auth.e2e-spec.ts` |
| Validation contenu | Script CI (packages/content-schema) | Tout fichier de `content/` valide | `content:validate` |
| Convention D-13 | `scripts/check-file-size.mjs` | Aucun fichier source > 400 lignes (hors exceptions listées) | étape CI dédiée |
| E2E | Playwright (v0.2) | Parcours : inscription → leçon → quiz → dashboard ; lab niveau 2 complet ; terminal web | `student-journey.spec.ts` |
| Charge | k6 (v1.0) | `/health`, catalogue, soumission quiz : 50 VU sans erreur | `load/catalogue.js` |

- Couverture visée : ≥ 60 % lignes backend en MVP, ≥ 70 % en v1.0 (seuils CI).
- Les tests d'intégration n'utilisent JAMAIS de vrai Docker/Proxmox : runners `simulation` uniquement (D-08).

---

## 36. CI/CD

Workflows GitHub Actions (`.github/workflows/`) :

1. **`ci.yml`** (MVP, sur PR et push `main`) : install (pnpm, cache), lint, typecheck, **check-file-size (D-13)**, tests unitaires, tests d'intégration (Testcontainers), build web + api.
2. **`content-validate.yml`** (MVP) : validation Zod de `content/**` dès qu'un fichier de contenu change.
3. **`docker.yml`** (v0.2) : build des images `web`, `api`, validateurs ; scan Trivy ; publication GHCR (tags `sha-` + `latest` sur `main`).
4. **`security.yml`** (v0.2) : gitleaks, pnpm audit (seuil high).
5. **Déploiement** : manuel en MVP (`git pull && docker compose up -d --build` sur l'hôte) ; v0.2 : `docker compose pull && up -d` après publication GHCR ; automatisation par watchtower ou webhook : `À VALIDER`.

Protection de branche : PR obligatoire sur `main`, CI verte requise, 1 approbation (soi-même accepté en solo, mais la discipline PR est exigée — valorisant pour le jury).

---

## 37. Déploiement local (développement)

Prérequis : Node.js 22, pnpm 9, Docker Desktop ou Docker Engine, Git.

```bash
git clone <repo> opensio && cd opensio
cp .env.example .env            # renseigner JWT_SECRET, DATABASE_URL...
pnpm install
docker compose -f infra/docker/docker-compose.dev.yml up -d   # PostgreSQL (+ Redis v0.2)
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma generate
pnpm content:sync               # indexe content/ en base
pnpm dev                        # web :3000 + api :4000
```

- `LAB_RUNNER=simulation` par défaut en local (aucun Docker requis pour les labs niveau 2 en dev Windows ; le runner `docker` est utilisable sous Linux/WSL2).
- Données d'amorçage : `pnpm seed` crée un compte admin (`admin@opensio.local` / mot de passe généré affiché une fois) et un compte étudiant de démonstration.

## 38. Déploiement homelab (production personnelle)

```bash
# Sur la VM/LXC « opensio » (Debian 12 + Docker) — 2 vCPU / 4 Go / 40 Go
git clone <repo> /opt/opensio && cd /opt/opensio
cp .env.example .env            # secrets de production, APP_URL, SMTP éventuel
docker compose -f infra/docker/docker-compose.yml up -d
docker compose exec api pnpm prisma migrate deploy
docker compose exec api pnpm content:sync
```

- **Domaine et TLS (D-17, confirmé)** : Caddy sert `https://opensio.home.lan` avec `tls internal` (CA locale gérée par Caddy). Le nom `opensio.home.lan` est résolu par le DNS local (entrée statique sur la box/routeur ou le serveur DNS du homelab ; à défaut, fichier `hosts` des clients).
- **Approbation de la CA sur les clients (une seule fois par machine)** : récupérer le certificat racine dans le volume Caddy (`/data/caddy/pki/authorities/local/root.crt`) et l'installer dans le magasin de confiance (Windows : `certlm.msc` → Autorités racines de confiance ; navigateur : rechargement). Procédure détaillée dans `docs/runbooks/tls-internal.md`.
- Le contenu est synchronisé par `git pull` + `content:sync` (cron ou déclenchement admin).
- Sauvegardes §32 actives dès le premier jour (y compris la copie vers le PC Windows, F10).
- v1.0 : le playbook Ansible `infra/ansible/deploy.yml` automatise l'ensemble (installation Docker, dépôt, env via vault, compose, cron sauvegarde).

---

## 39. Variables d'environnement

| Variable | Défaut | Obligatoire | Description |
|----------|--------|-------------|-------------|
| `NODE_ENV` | `development` | oui | `development` / `production` |
| `APP_URL` | `http://localhost:3000` | oui | URL publique du frontend (`https://opensio.home.lan` en homelab) |
| `API_PORT` | `4000` | oui | Port interne de l'API |
| `DATABASE_URL` | — | oui | Chaîne PostgreSQL |
| `JWT_SECRET` | — | oui | ≥ 64 octets aléatoires (HS256, D-09) |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | non | Durée refresh |
| `REGISTRATION_ENABLED` | `false` | non | Inscription ouverte |
| `CONTENT_PATH` | `./content` | oui | Racine du contenu Git |
| `CONTENT_GIT_REMOTE` | — | non | Remote pour la sync (homelab) |
| `LAB_RUNNER` | `simulation` | oui | `simulation` / `docker` / `proxmox` (v1.0) |
| `LAB_SESSION_TTL_MINUTES` | `45` | non | TTL des sessions (45 min par défaut, hôte 16 Go) |
| `LAB_MAX_GLOBAL_VMS` | `2` | v1.0 | Quota global de VM de lab (§27.3) |
| `DOCKER_SOCKET_PROXY_URL` | — | si runner docker | Ex. `tcp://socket-proxy:2375` |
| `TERMINAL_ENABLED` | `false` | v0.2 | Active la gateway WebSocket terminal (D-14) |
| `REDIS_URL` | — | v0.2 | Files et cache |
| `AI_ENABLED` | `false` | non | Active le chatbot |
| `AI_PROVIDER` | `openai-compatible` | si IA | Fournisseur (un seul provider couvre local + distant, D-16) |
| `AI_BASE_URL` | `http://host.docker.internal:11434/v1` | si IA | Ollama local (défaut) ou URL d'API distante |
| `AI_MODEL` | `llama3.1:8b` | si IA | Modèle (≤ 8B recommandé en local) |
| `AI_API_KEY` | — | si IA distante | Secret, jamais journalisé (vide en mode Ollama) |
| `AI_RATE_LIMIT_PER_HOUR` | `20` | non | Par utilisateur |
| `PROXMOX_API_URL` | — | v1.0 | Ex. `https://pve.home.lan:8006` |
| `PROXMOX_TOKEN_ID` / `PROXMOX_TOKEN_SECRET` | — | v1.0 | Token à privilèges limités |
| `PROXMOX_POOL` | `labs` | v1.0 | Pool dédié |
| `PROXMOX_TEMPLATE_IDS` | — | v1.0 | Mapping clé → template ID (JSON, ex. `{"debian-base":9000}`) |
| `PROXMOX_SIMULATE_FAILURE_RATE` | `0` | non | Tests du mode simulation |
| `NOVNC_ENABLED` | `false` | v1.0 | Active la console noVNC proxifiée (D-15) |
| `SMTP_URL` | — | non | Emails (reset mot de passe, notifications) |
| `BACKUP_DIR` | `/backups` | homelab | Cible des dumps |
| `BACKUP_COPY_TARGET` | — | homelab | Destination de la copie PC Windows (ex. `user@pc-windows:/backups/opensio` via rclone) |

Validation au démarrage par Zod (`apps/api/src/config`) : toute variable obligatoire manquante ou incohérente (ex. `LAB_RUNNER=proxmox` sans `PROXMOX_API_URL`) fait échouer le boot avec un message explicite.

---

## 40. Exigences matérielles

| Environnement | Minimum | Recommandé | Note |
|---------------|---------|------------|------|
| Développement (PC) | 8 Go RAM, 4 cœurs, 20 Go disque | 16 Go RAM, WSL2 | Ollama peut tourner ici (D-16) |
| Homelab — VM/LXC plateforme « opensio » | 2 vCPU, 4 Go RAM, 40 Go disque | 4 vCPU, 4 Go RAM, 60 Go | Dimensionné pour ne pas pressurer l'hôte |
| **Homelab — hôte Proxmox (confirmé)** | **16 Go RAM, 500 Go** | — | Budget labs VM : ≤ 4 Go RAM / ≤ 2 VM simultanées (§27.3) ; pas de VM Windows (§6) |

Répartition indicative de la RAM hôte : hyperviseur + services existants de l'auteur (~8 Go) + VM plateforme (4 Go) + labs (≤ 4 Go) = ≤ 16 Go.

---

## 41. Performance

- Budgets MVP : page leçon < 1,5 s en LAN (SSR + Markdown pré-rendu), API p95 < 300 ms hors validation de lab, validation de lab < 30 s (timeout dur).
- Le catalogue est mis en cache en mémoire process (invalidé à chaque sync) ; Redis en v0.2 si multi-instance.
- Images d'assets optimisées (Next/Image), code splitting par route, pas de librairie lourde côté client sans justification (CodeMirror et xterm.js chargés dynamiquement sur les pages de lab uniquement).
- Base : index §21 ; requêtes dashboard pré-agrégées (pas de N+1 — vérifié par tests d'intégration comptant les requêtes).

---

## 42. Accessibilité

- Cible WCAG 2.1 AA : contrastes ≥ 4,5:1, focus visible, navigation clavier complète (menus, éditeur, quiz), landmarks ARIA, alternatives textuelles pour schémas (description Mermaid fournie en `aria-label` + texte long adjacent).
- Préférence `prefers-reduced-motion` respectée (animations désactivables).
- Tailles de police relatives, zoom 200 % sans perte de contenu, cibles tactiles ≥ 44 px.
- Terminal web : sortie également consignée en texte dans `lab_events` pour relecture sans terminal (v0.2).
- Vérification : axe DevTools + tests Playwright + axe-core (v0.2) sur les pages principales.

---

## 43. Journalisation

- **Applicative** : JSON structuré (pino) — niveau, message, `requestId`, `userId` (si authentifié), route, durée. Niveau `info` en production, `debug` en dev. Aucune donnée sensible (mots de passe, tokens, contenu des réponses de quiz) dans les logs.
- **Audit métier** : table `audit_logs` pour les actions sensibles (RM-12) : auth échouée répétée, changement de rôle, sync de contenu, suppression de compte, actions admin.
- **Labs** : `lab_events` (§26.2-14), y compris l'ouverture de terminal/console.
- **Rétention** : logs conteneurs 14 j (rotation Docker `json-file` max 3×10 Mo) ; audit 12 mois ; événements d'activité 12 mois puis agrégation.

---

## 44. RGPD

| Obligation | Mise en œuvre |
|------------|---------------|
| Minimisation | Données collectées : email, nom d'affichage, progression, journaux techniques. Rien d'autre. |
| Base légale | Intérêt légitime / exécution du service (usage personnel et pédagogique) |
| Information | Page « Confidentialité » : finalités, durées, destinataires (aucun tiers sauf fournisseur IA **si le mode distant est activé** — mention explicite et bandeau, D-16), droits |
| Droit d'accès / portabilité | `GET /me/export` : archive JSON complète |
| Droit d'effacement | `DELETE /me` : anonymisation (email → hash, nom → « utilisateur supprimé ») avec conservation des agrégats anonymes ; suppression physique des tokens et conversations |
| Durées de conservation | Compte : jusqu'à suppression ; logs : §43 ; tokens : durée de vie + purge |
| Sécurité | §30–32 (chiffrement des sauvegardes, hachage, moindre privilège) |
| Sous-traitants | Aucun en mode IA locale (défaut) ; fournisseur IA distant listé si activé |
| Registre | Fiche de traitement simplifiée dans `docs/rgpd.md` |

---

## 45. Roadmap

| Jalon | Contenu principal | Critère de sortie | Durée indicative (à 10 h/sem.) |
|-------|-------------------|-------------------|-------------------------------|
| **v0.1 MVP** | Auth, catalogue, leçons, quiz, progression, dashboard, labs niv. 1–2, 5 scénarios guidés, Docker Compose + Caddy, CI (dont D-13) | Démonstration complète du parcours étudiant + CI verte + doc déploiement | 8–10 semaines |
| **v0.2 Intermédiaire** | Rôle teacher, labs niv. 3 **+ terminal web (D-14)**, chatbot IA **double mode (D-16)**, Redis/BullMQ, recherche, badges, Playwright, 10 scénarios | 1 lab conteneur réel validé de bout en bout avec terminal + chatbot fonctionnel en mode Ollama | 6–8 semaines |
| **v1.0 Avancé** | Labs niv. 4 Proxmox **Debian + noVNC (D-15)**, mode examen blanc, Prometheus/Grafana, Ansible, 2FA, notifications | 1 lab VM complet (clone → console noVNC → validation → nettoyage) + examen blanc noté | 8–10 semaines |
| **Expérimental** | RAG pgvector, FastAPI dédié, MinIO, Wazuh, i18n | Au cas par cas, hors engagement | — |

---

## 46. Backlog priorisé

Légende : P0 = MVP, P1 = v0.2, P2 = v1.0, P3 = expérimental.

| # | Élément | Priorité | Dépendances |
|---|---------|----------|-------------|
| B01 | Socle monorepo (pnpm, turbo, configs partagées, check-file-size D-13) | P0 | — |
| B02 | Schéma Prisma + migrations initiales | P0 | B01 |
| B03 | Auth complète (register/login/refresh/reset, HS256) | P0 | B02 |
| B04 | Schémas de contenu Zod + script `content:sync` | P0 | B01 |
| B05 | Rédaction contenu P0 (5 modules année 1) | P0 | B04 |
| B06 | API catalogue + rendu leçons (Markdown) | P0 | B04 |
| B07 | Quiz : API, correction, historique | P0 | B03, B04 |
| B08 | Progression + dashboard | P0 | B06, B07 |
| B09 | Labs niveau 1 (guidés) | P0 | B04 |
| B10 | Labs niveau 2 + runner simulation + runner docker | P0 | B03, B04 |
| B11 | 5 scénarios de panne guidés (S1, S2, S6, S7, S10) | P0 | B09 |
| B12 | Docker Compose prod + Caddy (TLS interne, D-17) + health | P0 | B01 |
| B13 | CI (lint, tests, build, file-size) + validation contenu | P0 | B01 |
| B14 | Export/suppression RGPD + page confidentialité | P0 | B03 |
| B15 | Rôle teacher + vues agrégées | P1 | B03 |
| B16 | Redis + BullMQ + worker de labs | P1 | B10 |
| B17 | Labs niveau 3 (conteneur de travail) | P1 | B16 |
| B18 | **Terminal web xterm.js + gateway WS (D-14)** | P1 | B17 |
| B19 | Chatbot IA (provider unique double mode D-16, RAG léger, rate limit) | P1 | B06 |
| B20 | Recherche plein texte | P1 | B06 |
| B21 | Badges | P1 | B08 |
| B22 | Tests E2E Playwright | P1 | B08, B10 |
| B23 | Scénarios S3, S4, S5, S8, S9 (dont versions conteneur) | P1 | B17 |
| B24 | Runner Proxmox (+ simulation) — quotas 16 Go | P2 | B10, hôte PVE |
| B25 | Labs niveau 4 (DHCP/DNS réels sur Debian) | P2 | B24 |
| B26 | **Console noVNC proxifiée (D-15)** | P2 | B25 |
| B27 | Mode examen blanc + rapport PDF | P2 | B08, B23 |
| B28 | Prometheus + Grafana | P2 | B12 |
| B29 | Playbook Ansible de déploiement | P2 | B12 |
| B30 | 2FA TOTP | P2 | B03 |
| B31 | Notifications email/webhook | P2 | B03 |
| B32 | RAG pgvector, MinIO, Wazuh, i18n | P3 | Selon cas |

---

## 47. User stories

| ID | En tant que… | Je veux… | Afin de… | Priorité |
|----|--------------|----------|----------|----------|
| US-01 | étudiant | créer un compte et me connecter | retrouver ma progression | P0 |
| US-02 | étudiant | parcourir les modules par année | structurer mes révisions | P0 |
| US-03 | étudiant | lire une leçon avec exemples de commandes | comprendre la notion | P0 |
| US-04 | étudiant | passer un quiz et voir la correction expliquée | valider mes acquis | P0 |
| US-05 | étudiant | voir ma progression par module | savoir quoi reprendre | P0 |
| US-06 | étudiant | recevoir des recommandations | optimiser mon temps de révision | P0 |
| US-07 | étudiant | résoudre un scénario de panne guidé | m'entraîner au diagnostic | P0 |
| US-08 | étudiant | éditer des fichiers de config et faire valider | pratiquer sans risque | P0 |
| US-09 | étudiant | utiliser des indices à coût de score | me débloquer sans gâcher l'exercice | P0 |
| US-10 | étudiant | exporter puis supprimer mes données | exercer mes droits RGPD | P0 |
| US-11 | admin | synchroniser le contenu depuis Git | publier de nouvelles leçons | P0 |
| US-12 | admin | gérer les comptes | contrôler l'accès | P0 |
| US-13 | formateur | voir la progression agrégée des étudiants | identifier les difficultés | P1 |
| US-14 | étudiant | poser une question au chatbot sans obtenir la solution | être guidé, pas assisté | P1 |
| US-15 | étudiant | travailler dans un vrai conteneur cassé **via un terminal web intégré** | pratiquer en conditions réelles sans rien installer | P1 |
| US-16 | étudiant | gagner des badges | rester motivé | P1 |
| US-17 | étudiant | lancer un lab sur une vraie VM Proxmox **avec console graphique noVNC** | réviser l'administration complète | P2 |
| US-18 | étudiant | passer un examen blanc chronométré avec rapport | préparer E5/E6 | P2 |
| US-19 | admin | déployer la plateforme avec Ansible | reproduire l'installation | P2 |
| US-20 | admin | visualiser les métriques dans Grafana | superviser la plateforme | P2 |
| US-21 | étudiant | choisir entre IA locale et IA distante | concilier confidentialité et qualité de réponse | P1 |

---

## 48. Critères d'acceptation

### US-03 (leçon)
- Étant donné un module publié, quand j'ouvre une leçon, alors le Markdown est rendu avec coloration des blocs de code, et les objectifs/prérequis/durée sont affichés en en-tête.
- Quand je fais défiler jusqu'en bas et clique « Marquer comme terminée », alors `lesson_progress.status = completed` et le dashboard reflète la progression au rechargement.

### US-04 (quiz)
- Les questions sont servies SANS `correct_choice_ids`.
- Après soumission, je vois : score en %, réussite/échec selon le seuil, correction question par question avec explications.
- Une tentative échouée ultérieure ne fait pas régresser mon statut « réussi » (RM-06) ; l'historique complet reste visible.

### US-08 (lab niveau 2)
- Je ne peux modifier que les fichiers listés `editable` ; toute tentative de chemin hors liste est rejetée (400).
- « Valider » retourne un verdict détaillé en < 30 s ; en cas de timeout, la session reste active et un message clair s'affiche.
- Après arrêt de la session, aucune ressource temporaire ne subsiste (vérifié par test d'intégration).

### US-11 (sync)
- Un fichier YAML invalide bloque la sync et affiche fichier + champ + erreur.
- Une sync valide est idempotente : la relancer ne crée aucun doublon.

### US-14 (chatbot)
- Si je demande la solution d'un lab en cours, le chatbot refuse et propose une piste (test automatisé sur 3 formulations).
- Au-delà de 20 messages/heure, je reçois un 429 explicite.
- En mode Ollama (défaut), aucune requête ne sort de l'hôte (vérifié par inspection réseau en test) ; en mode distant, le bandeau de confidentialité est visible.

### US-15 (terminal web, v0.2)
- Le terminal ne s'ouvre que pour une session `running` dont je suis propriétaire ; sinon 403.
- Les commandes tapées s'exécutent dans le conteneur du lab, jamais ailleurs ; la fermeture du terminal ne détruit pas la session.

### US-17 (lab Proxmox + noVNC, v1.0)
- Le démarrage clone depuis le template Debian dans le pool `labs`, sur le bridge isolé, dans la limite de 2 VM globales (au-delà : `409 LAB_CAPACITY_REACHED`).
- La console noVNC s'ouvre avec un ticket à durée limitée ; elle se ferme à l'expiration de la session.
- La session expire à TTL (45 min) et les VM sont détruites ; un balayage détruit toute VM `lab-*` orpheline (test en simulation).

---

## 49. Risques et mesures de réduction

| Risque | Probabilité | Impact | Mesure |
|--------|-------------|--------|--------|
| Dérive de périmètre (trop de fonctionnalités) | Élevée | Élevé | Jalons stricts §5 ; revue de fin de jalon ; règle « rien du jalon N+1 avant N terminé » |
| Orchestration Proxmox plus complexe que prévu | Élevée | Moyen | Niveaux de labs progressifs ; mode simulation ; Proxmox relégué en v1.0 |
| **Ressources hôte insuffisantes (16 Go)** | Moyenne | Moyen | Quotas stricts §27.3 (2 VM max, 1–2 Go/VM), TTL 45 min, `409 LAB_CAPACITY_REACHED`, VM Windows exclues (§6) |
| Rédaction du contenu plus longue que le développement | Élevée | Élevé | Contenu P0 limité à 5 modules ; rédaction en parallèle du socle ; qualité > quantité |
| Exécution de code de validation mal isolée | Moyenne | Élevé | Conteneurs `--network none`, non-root, quotas, timeout (§26.3) ; tests dédiés |
| Fuite de secrets | Faible | Élevé | `.env` hors Git, gitleaks en CI, validation au boot |
| **Perte de données — pas de support externe (D-18)** | Moyenne | Élevé | Dumps chiffrés quotidiens + copie planifiée vers le PC Windows (F10) + GitHub pour le contenu ; test de restauration par jalon ; risque résiduel de sinistre simultané hôte+PC **assumé et documenté** ; extension 3ème copie prévue au runbook |
| Dépendance à une API IA payante | Faible | Faible | Mode Ollama local par défaut (D-16) ; `AI_ENABLED=false` toléré |
| Charge de travail incompatible avec les cours | Moyenne | Moyen | 10 h/sem. planifiées ; backlog ré-estimé à chaque jalon |
| Vulnérabilités des dépendances | Moyenne | Moyen | Dependabot, audit CI, images épinglées, Trivy v0.2 |
| Le projet devient indéfendable en soutenance (trop ambitieux) | Moyenne | Élevé | Le MVP seul suffit comme support E5 ; les jalons suivants sont du bonus documenté |
| **Fichiers monolithiques illisibles par les agents** | Moyenne | Moyen | Convention D-13/RM-13 (200–400 lignes), vérifiée en CI (`check-file-size.mjs`) |

---

## 50. Plan de démonstration

### 50.1 Démonstration MVP (10 min)

1. Connexion étudiant → dashboard (progression, recommandations).
2. Lecture d'une leçon (rendu Markdown, commandes) → marquage terminée.
3. Quiz → échec volontaire → correction expliquée → nouvelle tentative réussie.
4. Lab niveau 2 « Plan d'adressage » → édition du CSV → validation échouée (verdict détaillé) → indice → validation réussie → score minoré (RM-05 visible).
5. Scénario « DHCP indisponible » guidé → diagnostic → remédiation → corrigé.
6. Côté admin : `content:sync` en direct (ajout d'une leçon via commit → visible après sync).
7. Côté ops : `docker compose ps`, logs structurés, `/health`, restauration d'une sauvegarde (extraits du runbook).

### 50.2 Démonstration v0.2/v1.0 (ajouts)

- Lab niveau 3 : ouverture du **terminal web**, réparation d'un DNS cassé en direct, validation.
- Chatbot en mode Ollama : question de cours (réponse guidée) puis demande de solution (refus pédagogique) ; bascule visuelle du mode local/distant.
- Lab Proxmox complet : démarrage (clonage visible dans l'UI PVE), **console noVNC**, réparation, validation, expiration TTL et destruction.
- Examen blanc chronométré + rapport PDF.
- Grafana : métriques de la plateforme pendant la démo.

---

## 51. Éléments pour le rapport de BTS

| Livrable BTS | Élément du projet correspondant |
|--------------|--------------------------------|
| Expression des besoins | §2–§6, personas §9 |
| Cahier des charges | §11–§12, backlog §46 |
| Conception | Architecture §13–§16, décisions §18 (rédiger les ADR dans `docs/architecture/`), modèle de données §20–§21 |
| Réalisation | Dépôt Git (historique PR = preuve de méthode), captures, extraits de code commentés |
| Mise en production | §37–§38, runbooks `docs/runbooks/`, sauvegardes §32 |
| Sécurité | §29–§31, RGPD §44 |
| Gestion de projet | Roadmap §45, GitHub Projects (kanban), CI §36 |
| Veille technologique | Choix justifiés §17 (tableaux comparatifs réutilisables tels quels, dont Caddy vs Nginx et ttyd vs xterm.js) |
| Compétences référentiel couvertes | Table de correspondance `competency_refs` des modules (B2.x, B3.x) — à exporter pour le dossier |

Conseil : tenir un journal de bord hebdomadaire (`docs/journal.md`) — difficultés, solutions, temps passé. C'est la matière première du rapport et de la soutenance.

---

## 52. Glossaire

| Terme | Définition |
|-------|-----------|
| **ADR** | Architecture Decision Record — court document justifiant une décision technique |
| **APIPA** | Adressage automatique IPv4 (169.254.0.0/16) quand DHCP échoue |
| **Argon2id** | Algorithme de dérivation de clé recommandé pour le hachage de mots de passe |
| **BullMQ** | File de tâches Node.js adossée à Redis |
| **CIDR** | Notation d'adressage sans classe (ex. /26) |
| **Cloud-init** | Mécanisme d'initialisation de VM cloud (utilisateurs, clés, paquets) |
| **GHCR** | GitHub Container Registry |
| **HIDS** | Détection d'intrusions basée hôte (ex. Wazuh) |
| **HS256 / RS256** | Algorithmes de signature JWT : symétrique (secret partagé, retenu) / asymétrique (paire de clés, inutile en mono-instance) |
| **Idempotence** | Propriété d'une opération donnant le même résultat si répétée |
| **JWT** | JSON Web Token — jeton signé transportant des claims |
| **Linked clone** | Clone de VM partageant le disque du modèle (rapide, économe) |
| **MVP** | Produit minimum viable |
| **noVNC** | Client VNC en HTML5/WebSocket pour consoles graphiques de VM |
| **Ollama** | Serveur local de modèles de langage (API compatible OpenAI) |
| **PRA/PCA** | Plan de reprise / continuité d'activité |
| **RAG** | Génération augmentée par récupération (injection de documents dans le contexte d'un LLM) |
| **RFC 7807** | Format standard de réponse d'erreur HTTP (`application/problem+json`) |
| **SSE** | Server-Sent Events — flux unidirectionnel serveur → navigateur |
| **TTL** | Durée de vie avant expiration automatique |
| **ttyd** | Partage de terminal via le web (solution de repli à la gateway D-14) |
| **VLSM** | Découpage de sous-réseaux à masques de longueur variable |
| **websockify** | Relais WebSocket ↔ TCP utilisé pour la console noVNC |
| **xterm.js** | Émulateur de terminal en JavaScript pour le navigateur |
| **Zod** | Bibliothèque TypeScript de validation de schémas |

---

## 53. Annexes et exemples de fichiers

### Annexe A — `infra/docker/docker-compose.yml` (MVP, de référence)

```yaml
services:
  caddy:
    image: caddy:2.8
    restart: unless-stopped
    ports: ["443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    networks: [edge]

  web:
    build: { context: ../../apps/web }
    restart: unless-stopped
    environment:
      - API_INTERNAL_URL=http://api:4000
    networks: [edge]

  api:
    build: { context: ../../apps/api }
    restart: unless-stopped
    env_file: ../../.env
    volumes:
      - ../../content:/content:ro
    networks: [edge, backend]
    depends_on: [db]

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: opensio
      POSTGRES_USER: opensio
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks: [backend]

networks:
  edge:
  backend:
    internal: true

volumes:
  caddy_data:
  pgdata:
```

### Annexe B — Reverse proxy

**Caddyfile (retenu, D-06/D-17)** :

```
opensio.home.lan {
    tls internal
    handle /api/* {
        reverse_proxy api:4000
    }
    handle {
        reverse_proxy web:3000
    }
}
```

**Alternative Nginx (documentée à titre comparatif — non implémentée)** : bloc `server` avec `proxy_pass` vers `web:3000` et `api:4000`, certificats internes générés via mkcert (`mkcert -install` puis `mkcert opensio.home.lan`), renouvellement manuel. Conservée comme preuve de veille pour le rapport (§51) ; ne pas implémenter sauf décision contraire par ADR.

### Annexe C — `.env.example` (extrait)

```bash
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://opensio:change-me@localhost:5432/opensio
DB_PASSWORD=change-me
JWT_SECRET=generate-64-random-bytes
REGISTRATION_ENABLED=false
CONTENT_PATH=./content
LAB_RUNNER=simulation
LAB_SESSION_TTL_MINUTES=45
TERMINAL_ENABLED=false
AI_ENABLED=false
AI_BASE_URL=http://host.docker.internal:11434/v1
AI_MODEL=llama3.1:8b
```

### Annexe D — Verdict de validateur (exemple réel attendu)

Voir §26.3. Tout validateur livré dans `content/**/validator/` doit être accompagné d'un `README.md` décrivant ses contrôles et d'un jeu de fichiers « solution » utilisé par les tests pour vérifier que le validateur accepte une solution correcte et en refuse une incorrecte.

### Annexe E — Consigne système du chatbot (v0.2, point de départ)

```
Tu es « Mentor », tuteur pédagogique d'OpenSIO (BTS SIO SISR).
Règles impératives :
1. Tu expliques, tu guides, tu questionnes. Tu ne donnes JAMAIS la solution complète
   d'un lab, d'un quiz ou d'un scénario en cours (contexte fourni : {labSlug}).
2. Si l'utilisateur insiste pour obtenir une solution, tu refuses et proposes
   un indice ou une ressource de cours à la place.
3. Tu restes dans le périmètre systèmes, réseaux, cybersécurité DÉFENSIVE.
4. Tu cites les leçons de la plateforme quand elles couvrent la question.
5. Réponses concises, en français, avec exemples de commandes quand pertinent.
```

### Annexe F — `scripts/check-file-size.mjs` (principe, D-13)

Script Node exécuté en CI : parcourt `apps/`, `packages/`, `infra/` ; échoue si un fichier `*.ts|tsx|css|prisma` dépasse 400 lignes. Exceptions en liste blanche explicite dans le script (migrations Prisma, fichiers générés). Seuil d'avertissement à 300 lignes (rapport sans échec).

---

# Instructions pour Antigravity

## 0. Décisions actées par le commanditaire (ne pas remettre en cause sans ADR)

- **D-06** : Caddy (TLS interne). Nginx = annexe comparative uniquement.
- **D-09** : JWT HS256, secret ≥ 64 octets.
- **D-13** : fichiers source 200–400 lignes max, découpage obligatoire, contrôle CI.
- **D-14** : terminal web = xterm.js + gateway WebSocket NestJS (`docker exec`), v0.2.
- **D-15** : console VM = noVNC proxifiée (websockify + tickets), v1.0.
- **D-16** : IA double mode via un provider unique `OpenAiCompatible` ; défaut Ollama local.
- **D-17** : projet **OpenSIO**, dépôt `opensio`, domaine `opensio.home.lan`, TLS CA interne Caddy.
- **D-18** : sauvegarde sans support externe : hôte + copie PC Windows + GitHub (contenu).
- **H1** : hôte Proxmox 16 Go RAM / 500 Go → quotas §27.3, pas de VM Windows.

## 1. Ordre recommandé d'implémentation

1. **Lot 0 — Socle** : monorepo pnpm + Turborepo, configs partagées (eslint, tsconfig, tailwind), `scripts/check-file-size.mjs`, `docker-compose.dev.yml` (PostgreSQL), CI squelette.
2. **Lot 1 — Données** : schéma Prisma complet du MVP (§20.1), migrations, seed.
3. **Lot 2 — Contenu** : `packages/content-schema` (Zod, 1 schéma = 1 fichier), script `content:sync`, 1 module de démonstration complet (leçon + quiz + lab niveau 2) AVANT d'écrire le reste du contenu.
4. **Lot 3 — Auth** : register/login/refresh/reset (HS256) + guards + tests d'intégration.
5. **Lot 4 — Catalogue & leçons** : API lecture + pages frontend + rendu Markdown sécurisé.
6. **Lot 5 — Quiz** : API + UI + scoring + historique.
7. **Lot 6 — Progression & dashboard** : événements, agrégats, recommandations.
8. **Lot 7 — Labs niveau 1 puis 2** : runner `simulation` d'abord, runner `docker` ensuite, validateur de référence.
9. **Lot 8 — Scénarios guidés** : S1, S2, S6, S7, S10.
10. **Lot 9 — Production** : compose prod, Caddy (`opensio.home.lan`, TLS interne), sauvegardes (dont copie PC Windows), runbooks, page RGPD, export/suppression.
11. **Revue de jalon MVP** → seulement ensuite, ouvrir le backlog v0.2.

## 2. Fichiers à créer en premier

1. `pnpm-workspace.yaml`, `turbo.json`, `package.json` racine
2. `packages/config/*` (eslint, tsconfig)
3. `scripts/check-file-size.mjs` (D-13)
4. `apps/api/prisma/schema.prisma`
5. `packages/content-schema/src/lesson.ts`, `module.ts`, `quiz.ts`, `lab.ts` (1 schéma = 1 fichier)
6. `apps/api/src/config/env.validation.ts`
7. `.env.example`, `.gitignore` (incluant `.env`), `README.md`, `LICENSE` (MIT)
8. `content/tracks/annee-1/modules/reseaux-fondamentaux/**` (module de démonstration)
9. `.github/workflows/ci.yml` et `content-validate.yml`

## 3. Commandes initiales

```bash
pnpm dlx create-turbo@latest opensio
cd opensio
# créer apps/web (create-next-app) et apps/api (nest new) dans le workspace
docker compose -f infra/docker/docker-compose.dev.yml up -d
pnpm --filter api prisma migrate dev --name init
pnpm content:sync && pnpm seed
pnpm dev
```

## 4. Validations à effectuer à chaque lot

- `pnpm lint && pnpm typecheck && pnpm test && node scripts/check-file-size.mjs` verts.
- Tests d'intégration du lot écrits et passants (Testcontainers, runner simulation).
- `content:sync` idempotent sur le module de démonstration.
- Aucun secret dans le diff (gitleaks local).
- Mise à jour du `README.md` et du journal `docs/journal.md`.

## 5. Points encore ouverts (non bloquants pour démarrer)

1. Emplacement d'exécution d'Ollama en v0.2 (PC de dev recommandé vs VM dédiée) — `À VALIDER` à l'ouverture du jalon v0.2.
2. Automatisation du déploiement (watchtower/webhook vs manuel) — `À VALIDER` en v0.2.
3. Loki pour les logs en v1.0 — `À VALIDER`.
4. Configuration SMTP (reset de mot de passe par email) — optionnel ; le mode « lien affiché côté admin » suffit en MVP.

## 6. Règles interdisant la génération massive non vérifiée

- Ne jamais générer plus d'un lot (§1 ci-dessus) sans validation des commandes du lot précédent.
- Ne jamais écrire de code pour une fonctionnalité v0.2/v1.0 (chatbot, Redis, terminal web, Proxmox, noVNC, 2FA, badges) tant que le MVP n'est pas validé — créer uniquement les interfaces/emplacements prévus (ex. `AiProvider`, `LabRunner`) sans implémentation.
- Ne jamais inventer un endpoint, un champ de base ou un fichier de contenu absent de ce document : toute addition passe par une proposition explicite (ADR ou mise à jour de ce blueprint).
- Ne jamais désactiver un test, une validation de schéma ou le contrôle de taille de fichiers pour faire passer la CI.
- Ne jamais committer de secret, même « temporaire ».
- **Ne jamais produire un fichier source de plus de 400 lignes (RM-13/D-13) : découper par responsabilité avant d'écrire, pas après.**

## 7. Méthode de travail par petits lots

- Une branche par élément du backlog (`feat/b07-quiz-api`), PR vers `main`, CI verte obligatoire.
- Commits conventionnels (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Chaque PR : description liée à l'user story (US-xx) et aux critères d'acceptation (§48).
- Revue de fin de semaine : mise à jour du kanban GitHub Projects et du journal.

## 8. Critères indiquant qu'une étape est terminée

Une étape (lot) est terminée si et seulement si :
1. Les critères d'acceptation associés (§48) sont démontrés ;
2. Les tests (unitaires + intégration) couvrant le lot existent et passent en CI ;
3. Le contrôle D-13 (taille des fichiers) passe ;
4. La documentation utilisateur/développeur concernée est à jour (README, runbook le cas échéant) ;
5. Aucune ressource temporaire ne fuit (conteneurs, fichiers, tokens) — vérifié par test ou inspection ;
6. Le journal de bord consigne ce qui a été fait, les difficultés et les décisions prises.

---

*Fin du blueprint OpenSIO v0.2.0. Toute évolution de ce document suit le même cycle de revue que le code (PR + validation).*
