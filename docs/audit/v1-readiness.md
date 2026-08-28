# Audit de préparation v1.0 — OpenSIO

> **Date** : 2026-08-28 · **Branche** : `audit/v1-readiness` / `docs/audit-v1-readiness` · **Base d'analyse** : `main` 7cf301c (PR #48)
> **Objectif** : état des lieux complet du dépôt avant l'ouverture du jalon v1.0 (homelab Proxmox), conformément à la feuille de route (`docs/roadmap.md` §3) et aux règles du blueprint (§18, §35, §36, « Instructions pour Antigravity »).

---

## 1. Rejouage des validations contractuelles

| Contrôle | Résultat | Détail |
|---|---|---|
| `pnpm lint` | ✅ 0 erreur | 14 warnings `no-explicit-any` (tests) |
| `pnpm typecheck` | ✅ | 4/4 tâches |
| `pnpm test` | ✅ 357 tests | API 228 (44 fichiers) · web 111 (33 fichiers) · content-schema 18 (2 fichiers) |
| `node content/validate.mjs` | ✅ 100 % | 2 tracks, 17 modules, 89 leçons, 89 quiz (457 questions), 38 labs, **117/117 tests validateurs** |
| `pnpm content:validate` | ✅ 18/18 | Schémas Zod |
| `node scripts/check-file-size.mjs` | ✅ 0 violation D-13 | 10 avertissements ≥ 300 lignes (seuil d'attention) |
| `node scripts/check-theme-classes.mjs` | ✅ 0 violation | 83 fichiers |
| `pnpm content:sync` | ✅ idempotent | Tous compteurs « inchangés » sur base de dev |
| CI GitHub (`main`) | ✅ verte | 6 derniers runs (CI + validation contenu) en succès, dont PR #48 |

## 2. Constats classés

### C1 — Majeur · Secrets de test suivis par git (corrigé)
- **Constat** : `.env.test` (racine) et `apps/api/.env.test` étaient suivis par git et contenaient un secret JWT effectif (128 caractères) ainsi que le mot de passe PostgreSQL, en plus des templates `.env.test.example` correspondants. Violation de la règle blueprint « Ne jamais committer de secret, même "temporaire" ».
- **Portée** : credentials de développement/test uniquement (jamais utilisés en production) ; la CI fournit ses propres variables (vérifié dans `.github/workflows/ci.yml`, aucun `cp .env.test`) ; `apps/api/test/setup-env.ts` gère l'absence du fichier (fallback `opensio_test` + dérivation automatique + garde-fou anti-écrasement).
- **Correction** (commit `chore(security)` de cette branche) : `git rm --cached` des deux fichiers (conservés localement), ajout au `.gitignore`, templates `.example` conservés. Les fichiers locaux ne sont pas supprimés afin de préserver l'exécution locale des tests.
- **Suivi recommandé** : envisager une rotation systématique des secrets de test et un scan `gitleaks` en CI (v1.0) — l'outil n'est pas encore intégré.

### C2 — Majeur · Dérive documentaire (corrigé)
- `docs/roadmap.md` §4.1 indiquait « 2 modules livrés en 1ère année, 0 en 2ème » — la réalité est 8/8 et 9/11 (89 leçons, 38 labs). §4.2 complété par un statut des phases.
- `README.md` : table des modules figée à 2 modules, « 350+ tests » (réalité : 470+ contrôles), `pnpm 10` au lieu de `pnpm 11`, référence morte `pnpm doctor` (n'existe nulle part), `scripts/backup-db.sh` inexistant (le script réel est `scripts/backup.sh`).
- `docs/journal.md` : aucune entrée pour les PRs #40–#48 (9 modules annee-2) — entrée récapitulative ajoutée.

### C3 — Mineur · Artefact de CI obsolète (nettoyé)
- `ci-fail.log` (86 Ko, 25/08) documente un échec ShellCheck déjà corrigé (branche `fix/ci-shellcheck` fusionnée dans `main`, vérifié via `git branch --merged`). Fichier ignoré par `*.log`, supprimé localement.

### C4 — Info · Conformité blueprint §6 (vérifiée, rien à faire)
- Aucune implémentation v1.0 anticipée : `proxmox` n'apparaît que dans `env.validation.ts` (énumération `LAB_RUNNER`), `lab-runner.interface.ts` (union de types) et `formatters.ts` (label de badge) ; aucune occurrence `noVNC`/`websockify` dans le code. Les interfaces `LabRunner` (implémentation `simulation` livrée) et `AiProvider` sont en place, comme prévu.

### C5 — Travail prévu · Contenu annee-2 incomplet
- 9/11 modules livrés ; il manque **`serveurs-web-pki-tls`** (fiche #11 : 6 leçons, 6 quiz, 3 labs) et **`vpn-acces-distants`** (fiche #12 : 5 leçons, 5 quiz, 2 labs). Réconciliation cartographie ↔ contenu détaillée dans `docs/roadmap.md` §4.1 (renommages/consolidations documentés).

### C6 — Mineur · Dette d'avertissements D-13 (acceptée, à surveiller)
- 10 fichiers entre 300 et 400 lignes (aucune violation). Aucun dépassement du seuil dur ; à surveiller lors des prochains lots.

## 3. Décisions prises
1. Le retrait des `.env.test` du suivi git est un **alignement sur le blueprint** (règle anti-secret), pas une addition fonctionnelle → pas d'ADR requise ; consigné au journal.
2. Les renommages/consolidations de la cartographie annee-2 sont **documentés** dans `roadmap.md` §4.1 plutôt que rétro-renommés, afin de préserver la traçabilité des PRs.
3. Les deux modules manquants seront produits **après** la fusion des correctifs d'audit (ordre des lots respecté) : une branche/PR par module.

## 4. Verdict de préparation v1.0
- **Socle et MVP : prêts** (validations 100 % vertes, CI stable, sécurité à jour après correction C1).
- **Contenu : 17/19 modules** — finalisation en cours (C5).
- **Jalon v1.0 (Proxmox/noVNC/SDN)** : pourra être ouvert une fois les 2 modules livrés et la revue de jalon MVP/Vx actée, conformément aux points ouverts du blueprint (« Instructions » §5).

---
*Rapport généré dans le cadre du lot d'audit `v1-readiness` ; preuves rejouables via les commandes du §1.*