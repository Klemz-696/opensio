# Validateur du Lab — Plan d'adressage d'une PME

Ce répertoire contient le script de validation automatique du lab **Plan d'adressage d'une PME** (niveau 2 — fichiers), conformément aux spécifications du Blueprint OpenSIO (§26.3 et §53 Annexe D).

## Contrôles effectués

Le validateur analyse le fichier `plan.csv` placé dans le répertoire de travail et évalue 3 contrôles :

1. **`subnets_valid` (60 points, obligatoire)** :
   - Vérifie que chaque service dispose d'un préfixe adapté à sa capacité requise :
     - Production (50 postes) -> préfixe maximal `/26` (62 hôtes).
     - Invités (20 postes) -> préfixe maximal `/27` (30 hôtes).
     - Comptabilité (10 postes) -> préfixe maximal `/28` (14 hôtes).
   - Vérifie que les adresses réseau sont incluses dans le bloc `10.20.0.0/24` et correctement alignées.

2. **`no_overlap` (25 points, obligatoire)** :
   - Vérifie l'absence totale de chevauchement entre les 3 sous-réseaux calculés.

3. **`doc_complete` (15 points, optionnel/bonus)** :
   - Vérifie la cohérence mathématique exacte de chaque ligne :
     - Première adresse hôte = réseau + 1.
     - Dernière adresse hôte = broadcast - 1.
     - Broadcast = dernière adresse du bloc de sous-réseau.
     - Passerelle = adresse située dans la plage utile des hôtes.

## Format de sortie

Sortie JSON standardisée sur `stdout` avec code de sortie `0` :

```json
{
  "passed": true,
  "score": 100,
  "checks": [
    { "id": "subnets_valid", "passed": true, "points": 60, "message": "Découpage VLSM correct..." },
    { "id": "no_overlap", "passed": true, "points": 25, "message": "Aucun chevauchement..." },
    { "id": "doc_complete", "passed": true, "points": 15, "message": "Toutes les adresses sont cohérentes..." }
  ]
}
```

## Jeux de solutions de test

- `solutions/valid/plan.csv` : solution complète et optimale (score 100/100, passed: true).
- `solutions/invalid-overlap/plan.csv` : solution avec collision/chevauchement de sous-réseaux (passed: false).
- `solutions/invalid-capacity/plan.csv` : solution avec sous-réseaux sous-dimensionnés (passed: false).
