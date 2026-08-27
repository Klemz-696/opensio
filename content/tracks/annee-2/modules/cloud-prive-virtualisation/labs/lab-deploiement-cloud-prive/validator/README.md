# Validateur : Déploiement et Configuration d'un Cluster Cloud Privé avec SDN et Quotas

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de configuration de cluster Cloud Privé.

## Critères d'Évaluation (100 points)
1. **`cluster_nodes_and_ha_config` (25 pts)** : Topologie du cluster avec 3 nœuds, IP de cluster et haute disponibilité.
2. **`resource_pools_and_quotas` (25 pts)** : Définition du pool de ressources multi-tenant avec quotas CPU, RAM et stockage.
3. **`sdn_zone_definition` (25 pts)** : Configuration de la zone VXLAN (`zone-prod`, MTU 1450, pairs).
4. **`sdn_vnets_and_subnets` (25 pts)** : Déclaration des VNets frontend/backend avec tag, sous-réseaux et passerelles.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire
```
