---
slug: restauration-metriques-rto-rpo
title: "Continuité d'activité (PCA / PRA), métriques RTO/RPO et tests de restauration"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 50
objectives:
  - "Distinguer le Plan de Continuité d'Activité (PCA - haute disponibilité) du Plan de Reprise d'Activité (PRA - reconstruction après sinistre)"
  - "Définir et calculer les métriques critiques RTO (Recovery Time Objective) et RPO (Recovery Point Objective)"
  - "Comprendre la notion de Perte Maximale Admissible (MTD - Maximum Tolerable Downtime)"
  - "Organiser et formaliser des campagnes de tests périodiques de restauration"
  - "Élaborer une matrice PCA/PRA d'entreprise classant les services selon leur criticité métier"
prerequisites:
  - "strategie-sauvegarde-3-2-1"
  - "technologies-stockage-raid"
competency_refs:
  - "B1.1"
  - "B2.3"
  - "B3.4"
success_criteria:
  - "Réussir le quiz 'Continuité d'Activité et Métriques RTO/RPO' avec au moins 80 %"
  - "Valider l'atelier 'Élaboration d'une Matrice PCA/PRA et Politiques RTO/RPO'"
labs:
  - slug: matrice-pca-pra-rpo-rto
    required: true
references:
  - label: "ANSSI — Élaborer un plan de continuité d'activité (PCA)"
    url: "https://cyber.gouv.fr/publications/elaboration-dun-plan-de-continuite-dactivite"
  - label: "Norme ISO 22301 — Systèmes de management de la continuité d'activité"
    url: "https://www.iso.org/standard/75106.html"
---

# Continuité d'Activité (PCA / PRA), Métriques RTO/RPO et Tests de Restauration

L'objectif ultime de toute politique de sauvegarde n'est pas simplement d'enregistrer des données sur un disque, mais d'être en mesure de **restaurer les opérations de l'entreprise** dans des délais et avec une fraîcheur de données acceptables pour les métiers.

---

## 1. PCA vs PRA : Deux Démarches Complémentaires

```text
+-------------------------------------------------------------------------------+
|                 Plan de Continuité d'Activité (PCA / High Availability)       |
|  - Objectif : Fonctionner EN CONTINU sans interruption visible pour l'usager. |
|  - Technologies : Clusters de serveurs, réplication synchrone, multi-sites.  |
|  - Coût : Très élevé.                                                         |
+-------------------------------------------------------------------------------+
                                      │ (Si sinistre majeur : Incendie / Ransomware)
                                      ▼
+-------------------------------------------------------------------------------+
|                   Plan de Reprise d'Activité (PRA / Disaster Recovery)        |
|  - Objectif : RECONSTRUIRE et redémarrer les services après un arrêt majeur.  |
|  - Technologies : Sauvegardes immuables, infrastructure de secours, Cloud DR. |
|  - Coût : Modéré à élevé selon les objectifs temporels RTO / RPO.             |
+-------------------------------------------------------------------------------+
```

---

## 2. Les Métriques Fondamentales : RPO, RTO et MTD

Pour chaque service informatique (ERP, Messagerie, Contrôleur de Domaine, Fichiers), la Direction et les administrateurs définissent conjointement des engagements chiffrés :

```text
  Dernière Sauvegarde                  Survenue du Sinistre                Reprise du Service
       (02h00)                              (14h00)                             (18h00)
──────────┼────────────────────────────────────┼───────────────────────────────────┼──────────► Temps
          │ ◄────────── RPO ─────────────────► │ ◄──────────── RTO ──────────────► │
          │         (12 heures perdues)        │          (4 heures d'arrêt)       │
```

### 2.1. RPO (_Recovery Point Objective_) : Perte de Données Maximale Admissible
- **Définition** : Quantité maximale de données (exprimée en durée) que l'entreprise peut tolérer de perdre définitivement lors d'un crash.
- **Impact technique** : Le RPO détermine directement la **fréquence des sauvegardes**.
  - RPO = 24 heures : Une sauvegarde quotidienne nocturne suffit.
  - RPO = 1 heure : Sauvegardes incrémentales de bases toutes les heures.
  - RPO = 0 seconde : Réplication synchrone en temps réel (RAID 1 réseau, clustering multi-nœuds).

### 2.2. RTO (_Recovery Time Objective_) : Durée Maximale d'Interruption Admissible
- **Définition** : Temps maximal alloué pour restaurer le service et le rendre à nouveau opérationnel pour les utilisateurs après la déclaration de l'incident.
- **Impact technique** : Le RTO détermine la **technologie de restauration**.
  - RTO = 15 minutes : Instant VM Recovery (Veeam) ou basculement automatique sur site de secours.
  - RTO = 4 heures : Restauration d'images disques depuis un NAS Gigabit.
  - RTO = 48 heures : Restauration depuis bandes magnétiques externalisées.

### 2.3. MTD (_Maximum Tolerable Downtime_)
La durée absolue au-delà de laquelle la survie économique ou légale de l'entreprise est gravement menacée. Le **RTO doit toujours être strictement inférieur au MTD** ($RTO < MTD$).

---

## 3. Matrice de Criticité des Services (Exemple Entreprise)

| Service Applicatif | Criticité | RPO Cible | RTO Cible | Stratégie Technique de Sauvegarde |
|---|:---:|:---:|:---:|---|
| **Active Directory DS** | Critique (Niv 1) | < 1 h | < 30 min | Sauvegarde quotidienne System State + Snapshot VM immuable horaire |
| **ERP / BDD PostgreSQL** | Critique (Niv 1) | < 15 min | < 1 h | Sauvegarde complète quotidienne + Archivage continu des journaux WAL toutes les 15 min |
| **Serveur de Fichiers (Compta/RH)** | Moyen (Niv 2) | < 24 h | < 4 h | Sauvegarde incrémentale nocturne rsync/Borg avec rétention GFS |
| **Serveur de logs / Archivage** | Faible (Niv 3) | < 7 jours | < 48 h | Sauvegarde hebdomadaire complète compressée sur stockage froid S3 Glacier |

---

## 4. Tests Périodiques de Restauration : L'Obligation Réelle

> [!WARNING]
> **Une sauvegarde qui n'a jamais été testée en conditions réelles n'existe pas.**

Selon les recommandations de l'ANSSI et les exigences de la norme **ISO 27001**, un calendrier rigoureux de tests de restauration doit être exécuté :

1. **Test unitaire automatisé (Hebdomadaire)** : Démarrage d'une VM de test dans un réseau virtuel isolé pour vérifier le boot de l'OS et l'intégrité de la base de données.
2. **Test granulaire (Mensuel)** : Restauration d'un échantillon aléatoire de 10 fichiers pour vérifier que les permissions NTFS/POSIX et les contenus sont intacts.
3. **Exercice PRA complet (Annuel)** : Simulation d'un sinistre total de salle serveur avec basculement sur le site de secours et chronométrage du RTO réel face au RTO théorique.
