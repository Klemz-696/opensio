---
slug: strategie-sauvegarde-3-2-1
title: "Stratégies de sauvegarde : règle 3-2-1-1-0, types de sauvegardes et rétention GFS"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Maîtriser la règle fondamentale de sauvegarde 3-2-1 et son extension moderne 3-2-1-1-0 (immuabilité et vérification zéro erreur)"
  - "Distinguer les types de sauvegarde : complète (Full), différentielle, incrémentale et incrémentale inverse"
  - "Comprendre les principes de déduplication au bloc et de compression des données"
  - "Élaborer une politique de rétention Grand-père-Père-Fils (GFS - Grandfather-Father-Son)"
  - "Comprendre les technologies de stockage immuable (WORM, Object Lock S3) et déconnecté (Air-Gap) contre les ransomwares"
prerequisites:
  - "technologies-stockage-raid"
competency_refs:
  - "B1.1"
  - "B2.3"
  - "B3.4"
success_criteria:
  - "Réussir le quiz 'Stratégie de Sauvegarde 3-2-1' avec au moins 80 %"
labs: []
references:
  - label: "ANSSI — Guide des bonnes pratiques de l'informatique (Sauvegardes)"
    url: "https://cyber.gouv.fr/bonnes-pratiques"
  - label: "CISA — Ransomware Prevention and Response Guide"
    url: "https://www.cisa.gov/stopransomware"
---

# Stratégies de Sauvegarde : La Règle 3-2-1-1-0 et la Rétention GFS

Les attaques par rançongiciels (_Ransomwares_) ciblent aujourd'hui en priorité les serveurs et dépôts de sauvegardes pour empêcher toute restauration sans paiement de la rançon. La mise en œuvre d'une architecture de sauvegarde résiliente et inviolable est le premier rempart de l'entreprise.

---

## 1. La Règle d'Or : Du 3-2-1 au 3-2-1-1-0

Historiquement formulée par Peter Krogh, la règle **3-2-1** s'est enrichie pour répondre aux menaces cyber modernes :

```text
                               +------------------------------------+
                               |     3 COPIES DE VOS DONNÉES        |
                               | (1 Production + 2 Sauvegardes)     |
                               +-----------------┬------------------+
                                                 │
                  ┌──────────────────────────────┴──────────────────────────────┐
                  ▼                                                             ▼
+------------------------------------+                         +------------------------------------+
|  2 SUPPORTS DIFFÉRENTS             |                         |  1 COPIE HORS-SITE (Off-Site)      |
|  (Ex: NAS interne + Baie SAN/SAN)  |                         |  (Data Center distant ou Cloud S3) |
+------------------------------------+                         +-----------------┬------------------+
                                                                                 │
                                  ┌──────────────────────────────────────────────┴──────────────────────────────┐
                                  ▼                                                                             ▼
                +------------------------------------+                                        +------------------------------------+
                |  1 COPIE IMMUABLE OU DÉCONNECTÉE   |                                        |  0 ERREUR DE RESTAURATION          |
                |  (WORM / S3 Object Lock / Air-Gap) |                                        |  (Tests automatisés périodiques)   |
                +------------------------------------+                                        +------------------------------------+
```

### Détail des 5 piliers de la règle 3-2-1-1-0 :
1. **3 Copies** : Vos données de production actives + au moins 2 copies de sauvegarde indépendantes.
2. **2 Médias différents** : Ne jamais stocker la sauvegarde sur le même volume RAID que la production (ex: Stockage NAS + Stockage Objet Cloud).
3. **1 Copie Hors-Site** : Une sauvegarde physiquement externalisée dans un bâtiment distant ou une région cloud pour résister aux incendies, inondations ou vols de matériel.
4. **1 Copie Immuable / Air-Gap** :
   - **Immuabilité (WORM - Write Once, Read Many)** : Les fichiers de sauvegarde sont verrouillés en écriture et suppression pendant $X$ jours au niveau du stockage (même le compte administrateur système compromis ne peut pas les détruire !).
   - **Air-Gap (Isolation physique)** : Bandes magnétiques LTO ou disques déconnectés physiquement du réseau.
5. **0 Erreur** : Vérification automatisée et tests réguliers d'intégrité et de restauration.

---

## 2. Typologie des Sauvegardes

| Type de Sauvegarde | Principe de Fonctionnement | Volume de Données Sauvegardé | Temps de Sauvegarde | Temps de Restauration |
|---|---|:---:|:---:|:---:|
| **Complète (_Full_)** | Sauvegarde de **l'intégralité** des fichiers ou blocs sélectionnés. | 100 % (Très lourd) | Lent | **Très rapide (1 seule source)** |
| **Différentielle** | Sauvegarde des modifications intervenues depuis la **dernière sauvegarde complète**. | Moyen (Grossit chaque jour) | Moyen | **Rapide (Dernière Full + Dernière Diff)** |
| **Incrémentale** | Sauvegarde uniquement des modifications intervenues depuis la **toute dernière sauvegarde** (complète ou incrémentale). | **Très faible** | **Ultra rapide** | Plus lent (Nécessite la Full + TOUTES les incrémentales intermédiaires dans l'ordre) |
| **Incrémentale Inverse (_Reverse Incremental_)** | La dernière sauvegarde est toujours transformée en Full synthétique à jour ; les deltas anciens deviennent des points de retour arrière. | Faible | Moyen | **Immédiat pour le point le plus récent** |

```text
[ Sauvegarde Différentielle ]
Dimanche (Full) ──► Lundi (Diff 1) ──► Mardi (Diff 2) ──► Mercredi (Diff 3)
                     (Modifs Dim)       (Modifs Dim)       (Modifs Dim)

[ Sauvegarde Incrémentale ]
Dimanche (Full) ──► Lundi (Incr 1) ──► Mardi (Incr 2) ──► Mercredi (Incr 3)
                     (Modifs Dim)       (Modifs Lun)       (Modifs Mar)
```

---

## 3. Déduplication et Compression au Bloc

Pour réduire l'espace de stockage consommé par les sauvegardes répétitives :
- **Compression** : Réduction de la taille des données par algorithme (ZSTD, GZIP, LZ4) à la volée.
- **Déduplication au bloc (_Block-Level Deduplication_)** : L'outil découpe les disques en blocs de taille fixe ou variable (ex: 4 Ko à 4 Mo) et calcule l'empreinte cryptographique (SHA-256) de chaque bloc. Si 50 machines virtuelles Windows partagent le même fichier système `kernel32.dll`, le bloc physique n'est enregistré qu'**une seule fois** sur le stockage.

---

## 4. Politique de Rétention GFS (_Grandfather-Father-Son_)

La stratégie **GFS** permet de conserver un historique étendu dans le temps (plusieurs années) tout en maintenant un nombre raisonnable de points de restauration :

- **Fils (_Son_)** : Sauvegardes quotidiennes (conservées 7 jours).
- **Père (_Father_)** : Sauvegardes hebdomadaires (conservées 4 semaines).
- **Grand-Père (_Grandfather_)** : Sauvegardes mensuelles et annuelles (conservées 12 mois à 5 ans pour les obligations légales/comptables).

```text
Semaine 1        Semaine 2        Semaine 3        Semaine 4
[L M M J V S D]  [L M M J V S D]  [L M M J V S D]  [L M M J V S D]  ===> 1 Mensuelle (Grand-Père)
     ▲                ▲                ▲                ▲
 (Quotidiennes)   (Quotidiennes)   (Quotidiennes)  (Hebdomadaire/Père)
```
