# Validateur du Lab — Plan d'adressage VLSM complet d'une entreprise multi-sites

Ce répertoire contient le script de validation automatique du lab **Plan d'adressage VLSM complet** (niveau 2 — fichiers), conformément au contrat de validation OpenSIO (§26.3 et §53 Annexe D).

## Contrôles effectués

Le validateur analyse le fichier `plan.csv` placé dans le répertoire de travail et évalue 3 critères :

1. **`subnets_valid` (50 points, obligatoire)** :
   - Vérifie que chaque service et liaison dispose d'un préfixe adapté à son besoin minimal :
     - Siège (500 postes) -> préfixe maximal `/23` (510 hôtes).
     - Agence Nord (120 postes) -> préfixe maximal `/25` (126 hôtes).
     - Agence Sud (60 postes) -> préfixe maximal `/26` (62 hôtes).
     - DMZ Serveurs (25 serveurs) -> préfixe maximal `/27` (30 hôtes).
     - Liaison WAN 1 (2 hôtes) -> préfixe maximal `/30` (2 hôtes).
     - Liaison WAN 2 (2 hôtes) -> préfixe maximal `/30` (2 hôtes).
   - Vérifie que les adresses réseau sont incluses dans le bloc `172.16.0.0/20` et alignées sur les limites de bloc binaires.

2. **`no_overlap` (30 points, obligatoire)** :
   - Vérifie l'absence totale de chevauchement d'adresses entre l'ensemble des sous-réseaux calculés.

3. **`doc_complete` (20 points, optionnel/bonus)** :
   - Vérifie la cohérence mathématique exacte de chaque ligne :
     - Première adresse hôte = réseau + 1.
     - Dernière adresse hôte = broadcast - 1.
     - Broadcast = dernière adresse du bloc de sous-réseau.
     - Passerelle = adresse valide située dans la plage utile.

## Format de sortie

```json
{
  "passed": true,
  "score": 100,
  "checks": [
    { "id": "subnets_valid", "passed": true, "points": 50, "message": "Découpage VLSM correct..." },
    { "id": "no_overlap", "passed": true, "points": 30, "message": "Aucun chevauchement..." },
    { "id": "doc_complete", "passed": true, "points": 20, "message": "Toutes les adresses sont cohérentes..." }
  ]
}
```
