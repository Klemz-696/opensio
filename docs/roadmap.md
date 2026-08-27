# 🗺️ Feuille de Route Pédagogique & Technique — OpenSIO

Ce document définit les jalons de développement de la plateforme OpenSIO, le bilan complet de la version livrée (**v0.1.0 MVP**) ainsi que les spécifications fonctionnelles et techniques des versions futures (**v0.2** et **v1.0**).

---

## 📌 1. Version v0.1.0 — MVP Livré (Bilan & Preuves)

La version **v0.1.0** constitue le socle fonctionnel complet et contractuel de la plateforme OpenSIO. L'ensemble des 9 lots prévus par le Blueprint a été intégralement réalisé, testé et validé, avec une conformité stricte aux exigences de gouvernance (convention D-13 ≤ 400 lignes par fichier) et un ensemble de **235 tests automatisés** à 100 % passants.

### Synthèse des lots livrés et preuves rejouables

| Lot       | Désignation                     | Fonctionnalités clés livrées                                                                                                                                                                                                                                                                                                                         | Preuve automatisée / Validation                                                                                           |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Lot 0** | **Socle Monorepo**              | Monorepo Turborepo + pnpm workspaces, configurations partagées TypeScript/ESLint/Tailwind, script de contrôle D-13, conteneur PostgreSQL dev, pipeline CI GitHub Actions.                                                                                                                                                                            | CI GitHub Actions verte, script `node scripts/check-file-size.mjs`.                                                       |
| **Lot 1** | **Données & Schéma Prisma**     | 15 tables PostgreSQL découpées en 6 sous-schémas Prisma modulaires, contraintes d'intégrité, migration initiale, script de seed avec hachage Argon2id ($m=64\text{ Mio}, t=3, p=4$), `PrismaService` NestJS.                                                                                                                                         | `pnpm db:migrate`, `pnpm seed`, tests unitaires `prisma.service.spec.ts`.                                                 |
| **Lot 2** | **Contenu & Synchronisation**   | Package `@opensio/content-schema` (1 schéma Zod par fichier), utilitaires de parsing/formatage d'erreurs, moteur `content:sync` transactionnel et 100 % idempotent, module démo SISR `reseaux-fondamentaux`.                                                                                                                                         | `pnpm content:validate`, `pnpm content:sync`, suite de tests `schemas.spec.ts`.                                           |
| **Lot 3** | **Authentification & Sécurité** | Endpoints `/api/v1/auth`, JWT 15 min en mémoire vive (D-09), refresh tokens rotatifs avec détection de réutilisation, politique de mot de passe, rate limiting par IP, journalisation d'audit (RM-12).                                                                                                                                               | `apps/api/test/demo-auth.ts`, `jwt.service.spec.ts`, `refresh-token.service.spec.ts`.                                     |
| **Lot 4** | **Catalogue & Leçons**          | Navigation par cursus/modules/leçons, rendu Markdown sécurisé (`rehype-sanitize`), coloration syntaxique Shiki, protection anti-path traversal (`LessonReaderService`), frontend Next.js 15 App Router avec session en mémoire.                                                                                                                      | `apps/api/test/demo-lot4.ts`, `catalog.service.spec.ts`, `lesson-reader.service.spec.ts`.                                 |
| **Lot 5** | **Quiz interactifs**            | QCM choix unique et multiple, correction 100 % côté serveur zéro-fuite (RM-01), seuil par défaut de 80 %, explications pédagogiques post-soumission, déduplication d'idempotence (`Idempotency-Key`).                                                                                                                                                | `apps/api/test/demo-lot5.ts`, `quiz-scoring.service.spec.ts`, `quiz-idempotency.service.ts`.                              |
| **Lot 6** | **Progression & Dashboard**     | Enregistrement de lecture avec heartbeat régulier (30s), complétion de module selon la règle RM-03, vue `/dashboard` apprenant complète (« Reprendre où j'en étais », recommandations, timeline d'activité).                                                                                                                                         | `apps/api/test/demo-lot6.ts`, `progress.service.spec.ts`, `progress-aggregation.service.ts`.                              |
| **Lot 7** | **Ateliers pratiques (Labs)**   | Machine à états de session de lab (`RUNNING` → `PASSED`/`FAILED`/`EXPIRED`), runner de validation découplé (`LabRunner`), éditeur multi-fichiers, indices pénalisés (RM-05), sweeper de nettoyage automatique des bacs à sable.                                                                                                                      | `apps/api/test/demo-lot7.ts`, `lab-sessions.service.spec.ts`, `lab-scoring.service.spec.ts`.                              |
| **Lot 8** | **Terminal & Mentor IA**        | Terminal virtuel avec liste blanche stricte de 15 commandes système (zéro exécution arbitraire), passerelle WebSocket JWT (`/ws/terminal`). Assistant Mentor IA double mode (Ollama local / OpenAI), tuteur Socratique zéro-spoil (RM-11), détection de contournement, mode libre hors évaluation, quotas d'appels horaires et préférences étudiant. | `apps/api/test/demo-lot8.ts`, `simulation-command-interpreter.spec.ts`, `chat.e2e.spec.ts`, `ai-solution-filter.spec.ts`. |

---

## 🚀 2. Version v0.2 — Déploiement Homelab & Mentor v2

La version **v0.2** a pour objectif de transformer le prototype de développement en une application robuste, prête pour l'auto-hébergement en environnement LAN de formation (Homelab, serveur d'établissement), enrichie d'un environnement d'exécution conteneurisé et d'une gestion avancée de l'intelligence artificielle.

### 2.1. Déploiement Homelab & Durcissement

- **Stack Docker Compose de Production** :
  - Découpage en services autonomes : `web` (Next.js standalone optimisé), `api` (NestJS production), `db` (PostgreSQL 16 Alpine avec volume persistant sécurisé), `redis` (cache et files de tâches) et `proxy` (reverse-proxy Caddy / Traefik).
  - Gestion automatisée des certificats TLS/HTTPS (Let's Encrypt pour les accès distants ou certificats locaux auto-signés pour les LAN isolés).
  - Durcissement des conteneurs : exécution sous utilisateurs non-root (`UID 10001`), systèmes de fichiers en lecture seule (`read_only: true`), désactivation de l'élévation de privilèges (`security_opt: no-new-privileges:true`), limites de mémoire et de CPU explicites.
- **Politique de Sauvegardes & Restauration (D-18)** :
  - Script automatisé de sauvegarde quotidienne à chaud de la base PostgreSQL (`pg_dump` compressé et chiffré via AES-256).
  - Rétention glissante sur 30 jours avec synchronisation optionnelle vers un stockage distant (NAS, volume NFS, S3/MinIO).
  - Procédure et script de test de restauration automatisée pour garantir l'intégrité des archives.

### 2.2. Mentor IA v2 — BYOK Multi-Providers & Gestion des Discussions

- **Architecture BYOK (Bring Your Own Key)** :
  - Possibilité pour chaque étudiant ou formateur de renseigner sa propre clé d'API dans ses préférences personnelles.
  - Stockage chiffré de bout en bout des clés d'API en base de données PostgreSQL à l'aide d'une clé maîtresse applicative (chiffrement AES-256-GCM avec vecteur d'initialisation aléatoire).
  - Prise en charge unifiée des principaux fournisseurs du marché :
    - **Ollama** (modèles locaux open-source sans fuite de données)
    - **OpenRouter** (routage vers de multiples modèles open-source et propriétaires)
    - **NVIDIA NIM** (inférence accélérée sur GPU)
    - **OpenAI / Anthropic** (modèles généralistes)
- **Gestion Complète des Conversations** :
  - Renommage automatique des discussions par l'IA ou renommage personnalisé par l'utilisateur.
  - Archivage des conversations d'ateliers ou de leçons passées.
  - Exportation des échanges au format Markdown ou JSON pour archivage personnel ou intégration dans le portfolio de compétences de l'étudiant.
  - Suppression unitaire ou en lot des historiques de discussion.
- **Streaming de Réponses (Server-Sent Events)** :
  - Affichage progressif des réponses du Mentor en temps réel (SSE) pour une expérience utilisateur fluide et immédiate.

### 2.3. Runner Docker pour les Ateliers Pratiques (D-07)

- Remplacement du runner simulé par un moteur d'exécution conteneurisé `DockerLabRunner` s'appuyant sur un `docker-socket-proxy` sécurisé (interdisant tout accès aux sockets d'administration de l'hôte).
- Création de conteneurs de validation éphémères dédiés par tentative avec isolation réseau (`--network none` pour les validateurs de code/fichiers).
- Quotas de sécurité stricts : limite mémoire (128 Mo à 512 Mo), limitation CPU (0.5 vCPU), limite de processus (`--pids-limit 100`) et destruction automatique avec garbage collector proactif.

### 2.4. Terminal Web Réel Haute Fidélité (D-14)

- Passage du terminal émulé à un véritable terminal Web Linux s'appuyant sur `xterm.js` dans le navigateur et un processus PTY virtuel (`node-pty` / conteneur Debian 12 dédié) côté backend.
- Prise en charge complète des signaux POSIX (`Ctrl+C`, `Ctrl+Z`, `Ctrl+D`), du redimensionnement dynamique de la grille (lignes/colonnes) et de la coloration ANSI 256 couleurs.
- Confinement dans un conteneur dédié jetable avec droits restreints (utilisateur standard sans `sudo` non contrôlé).

### 2.5. Services & Administration Pédagogique

- **Notifications & SMTP** : Intégration d'un transporteur SMTP pour la vérification des comptes, l'envoi d'invitations et la réinitialisation de mot de passe par email.
- **Conformité & Export RGPD** : Bouton d'exportation de l'intégralité des données personnelles dans le profil apprenant (archive ZIP contenant l'historique d'apprentissage, scores de quiz, sessions de lab et logs d'activité).
- **Interface d'Administration & Gestion de Cohortes** :
  - Tableau de bord pour formateurs et administrateurs.
  - Gestion des promotions d'étudiants (cohortes), activation/désactivation de comptes, réinitialisation forcée de sessions.
  - Visualisation des statistiques globales de réussite par module et détection des décrochages.
  - Consultation et filtrage en temps réel du journal d'audit de sécurité (`audit_logs`).

---

## 🏰 3. Version v1.0 — Infrastructure Lourde & Virtualisation Réseau

La version **v1.0** constituera l'aboutissement de la plateforme OpenSIO pour les travaux pratiques d'infrastructure avancée du BTS SIO SISR (blocs de compétences B1, B2 et B3 du référentiel national).

```
+-------------------------------------------------------------------------------+
|                             Plateforme OpenSIO v1.0                           |
+-------------------------------------------------------------------------------+
       |                                              |
       v                                              v
+-----------------------------+               +---------------------------------+
|  Next.js 15 Web & noVNC     |               |  NestJS Orchestration Engine    |
|  - Console interactive HTML5|               |  - Driver Proxmox VE REST API   |
|  - Topologies multi-noeuds  |               |  - SDN / IPAM / VLAN Manager    |
+-----------------------------+               +---------------------------------+
                                                               |
                                                               v
                                              +---------------------------------+
                                              |       Cluster Proxmox VE        |
                                              |  +---------------------------+  |
                                              |  | Pool VMs : Routeur pfSense|  |
                                              |  | Pool VMs : Windows Server |  |
                                              |  | Pool VMs : Client Debian  |  |
                                              |  +---------------------------+  |
                                              |  | SDN : VxLAN isolé apprenant| |
                                              |  +---------------------------+  |
                                              +---------------------------------+
```

### 3.1. Orchestration Proxmox VE (D-08)

- Pilote d'orchestration dédié communiquant directement avec l'API REST de **Proxmox VE** (authentification par API Token sécurisé).
- Provisionnement dynamique et automatisé de machines virtuelles (KVM) et de conteneurs système légers (LXC) pour chaque étudiant lors du démarrage d'un lab de niveau 4.
- Gestion des pools de ressources, quotas de mémoire globale, nombre maximal de VMs simultanées et arrêt programmé à l'expiration du TTL de session.

### 3.2. Console d'Accès Web noVNC / SPICE

- Intégration transparente d'un visualiseur graphique **noVNC HTML5** directement dans la page de l'atelier pratique OpenSIO via un tunnel WebSocket sécurisé et authentifié par JWT.
- Accès aux environnements graphiques sans nécessiter l'installation d'un client lourd sur le poste de l'étudiant :
  - Systèmes Windows Server 2022/2025 (Active Directory DS, DNS, DHCP, GPO)
  - Pare-feu et routeurs réseau (pfSense, OPNsense, VyOS)
  - Postes clients Windows 10/11 et distributions Linux bureautiques.

### 3.3. Topologies Multi-Machines & Réseaux Isolés (SDN)

- Déploiement de scénarios d'ateliers d'infrastructure complexes comprenant plusieurs machines interconnectées (ex : _1 Routeur pare-feu + 1 Serveur Web en DMZ + 1 Serveur AD DS + 1 Poste client_).
- Isolation réseau stricte entre apprenants par Software-Defined Networking (SDN Proxmox avec zones VxLAN ou VLANs dédiés par session) afin d'éviter tout conflit d'adresses IP ou diffusion parasite.
- Utilisation de modèles de disques maîtres (_Linked Clones_) permettant un démarrage quasi instantané (< 15 secondes) de topologies multi-VMs tout en minimisant l'empreinte disque sur le stockage de virtualisation.

---

## 📚 4. Feuille de Route Pédagogique — Lot D3 & Contenu SISR

Conformément à la spécification contractuelle du Blueprint (§25.1) et à la cartographie complète détaillée dans [`docs/modules-map.md`](./modules-map.md), le contenu pédagogique d'OpenSIO s'étend sur l'intégralité du programme national **BTS SIO option SISR** (1ère et 2ème année).

### 4.1. État d'avancement du Catalogue

| Parcours / Track | Modules livrés | Modules à créer | Total modules | Leçons opérationnelles | Labs opérationnels |
|---|:---:|:---:|:---:|:---:|:---:|
| **1ère Année (`annee-1`)** | 2 (`reseaux-fondamentaux`, `windows-server-ad`) | 6 | 8 | 13 | 7 |
| **2ème Année (`annee-2`)** | 0 | 11 | 11 | 0 | 0 |
| **Total Global** | **2** | **17** | **19** | **13** | **7** |

### 4.2. Planification des Phases de Production de Contenu

```
[Phase 1 : Cartographie des Modules] (Lot D3 - Terminé)
     │
     ▼
[Phase 2.1 : Socle Systèmes & Services 1ère Année]
  ├── linux-administration (6 leçons, 3 labs)
  └── services-reseau-linux (5 leçons, 2 labs)
     │
     ▼
[Phase 2.2 : Infrastructure & Support 1ère Année]
  ├── virtualisation-systemes (5 leçons, 2 labs)
  ├── sauvegardes-stockage (5 leçons, 2 labs)
  ├── support-parc-glpi (5 leçons, 2 labs)
  └── anglais-technique (5 leçons, 2 labs)
     │
     ▼
[Phase 2.3 : Réseaux Avancés, Sécurité & Web 2ème Année]
  ├── routage-interconnexion (5 leçons, 2 labs)
  ├── securite-pare-feu-filtrage (6 leçons, 3 labs)
  ├── serveurs-web-pki-tls (6 leçons, 3 labs)
  └── vpn-acces-distants (5 leçons, 2 labs)
     │
     ▼
[Phase 2.4 : Automatisation, DevOps & Métrologie 2ème Année]
  ├── scripting-automatisation (6 leçons, 2 labs)
  ├── conteneurisation-docker (6 leçons, 3 labs)
  ├── supervision-metrologie (5 leçons, 2 labs)
  └── automatisation-ansible (5 leçons, 2 labs)
     │
     ▼
[Phase 2.5 : Cybersécurité Avancée, Haute Disponibilité & Cloud]
  ├── cybersecurite-durcissement-audit (6 leçons, 3 labs)
  ├── haute-disponibilite-clustering (5 leçons, 2 labs)
  └── cloud-hybride-cicd (5 leçons, 2 labs)
```

> 📖 Pour le détail complet des fiches modules, blocs de compétences associés, barèmes et jeux d'essais, consulter [`docs/modules-map.md`](./modules-map.md).

