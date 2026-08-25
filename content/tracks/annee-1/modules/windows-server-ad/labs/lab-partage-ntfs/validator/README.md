# Validateur du Lab — Sécurisation des partages SMB et permissions NTFS selon la méthode AGDLP

Ce répertoire contient le script de validation automatique du lab **Partage et droits NTFS** (niveau 2 — fichiers), conformément au contrat de validation OpenSIO (§26.3 et §53 Annexe D).

## Contrôles effectués

Le validateur analyse le fichier `plan.csv` placé dans le répertoire de travail et évalue 3 critères :

1. **`shares_valid` (35 points, obligatoire)** :
   - Vérifie la conformité des 4 répertoires partagés, des noms de partages SMB et des autorisations de partage (Modifier).

2. **`ntfs_groups_agdlp_valid` (45 points, obligatoire)** :
   - Vérifie la convention de nommage et la séparation des Groupes de Domaine Local d'accès en écriture/modification (`_M`) et en lecture seule (`_L`) pour chaque service.

3. **`inheritance_policy_valid` (20 points, optionnel/bonus)** :
   - Vérifie la désactivation de l'héritage (`inheritance_disabled = true`) sur les répertoires confidentiels et son maintien (`false`) sur le dossier Commun.

## Format de sortie

```json
{
  "passed": true,
  "score": 100,
  "checks": [
    { "id": "shares_valid", "passed": true, "points": 35, "message": "Partages SMB et permissions réseau conformes..." },
    { "id": "ntfs_groups_agdlp_valid", "passed": true, "points": 45, "message": "Groupes GDL conformes à la méthode AGDLP..." },
    { "id": "inheritance_policy_valid", "passed": true, "points": 20, "message": "Politique d'héritage NTFS respectée..." }
  ]
}
```
