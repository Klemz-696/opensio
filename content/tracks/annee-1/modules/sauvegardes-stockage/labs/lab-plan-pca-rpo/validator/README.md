# Validateur : Élaboration d'une Matrice PCA/PRA et Politiques RTO/RPO

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de conception de matrice de continuité d'activité.

## Critères d'Évaluation (100 points)
1. **`services_presence_and_structure` (25 pts)** : Présence des 4 services d'entreprise et format CSV valide.
2. **`rpo_targets_valid` (25 pts)** : RPO $\le$ 15min pour l'ERP, $\le$ 1h pour l'Active Directory, $\le$ 24h pour les fichiers.
3. **`rto_targets_valid` (25 pts)** : RTO $\le$ 30min pour l'Active Directory, $\le$ 1h pour l'ERP, $\le$ 4h pour les fichiers.
4. **`backup_strategy_and_tests` (25 pts)** : Cohérence des méthodes de sauvegarde (System State, WAL, rsync) et périodicité des tests de restauration.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/plan-continuite.csv
```
