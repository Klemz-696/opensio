# Validateur du Lab — Conception de l'arborescence des UO et liaison des stratégies de groupe (GPO)

Ce répertoire contient le script de validation automatique du lab **Organisation UO et GPO** (niveau 2 — fichiers), conformément au contrat de validation OpenSIO (§26.3 et §53 Annexe D).

## Contrôles effectués

Le validateur analyse le fichier `structure-uo.csv` placé dans le répertoire de travail et évalue 3 critères :

1. **`ou_hierarchy_valid` (40 points, obligatoire)** :
   - Vérifie la présence et la syntaxe Distinguished Name (DN) exacte des 8 Unités d'Organisation requises.

2. **`gpo_links_valid` (40 points, obligatoire)** :
   - Vérifie l'affectation correcte des 8 GPOs à leur niveau hiérarchique respectif.

3. **`inheritance_enforced_valid` (20 points, optionnel/bonus)** :
   - Vérifie la configuration de l'isolation de sécurité sur l'UO Serveurs (`block_inheritance = true` et `gpo_enforced = true`).

## Format de sortie

```json
{
  "passed": true,
  "score": 100,
  "checks": [
    { "id": "ou_hierarchy_valid", "passed": true, "points": 40, "message": "Arborescence des 8 UO conforme..." },
    { "id": "gpo_links_valid", "passed": true, "points": 40, "message": "Liaisons de GPO conformes..." },
    { "id": "inheritance_enforced_valid", "passed": true, "points": 20, "message": "Héritage et enforcement conformes..." }
  ]
}
```
