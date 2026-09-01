# Validateur : Configuration de Découverte Réseau et Inventaire SNMP

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier d'inventaire SNMP d'infrastructure sous GLPI.

## Critères d'Évaluation (100 points)
1. **`task_header_and_proxy` (20 pts)** : En-tête de tâche `task`, activation et déclaration de l'agent proxy GLPI.
2. **`targets_ip_ranges` (30 pts)** : Périmètres IP pour les commutateurs (192.168.10.x) et copieurs (192.168.20.x).
3. **`credentials_snmp_v2c_v3` (30 pts)** : Profils SNMP v2c (communauté) et SNMP v3 sécurisé (`authPriv`, `SHA`, `AES`).
4. **`topology_lldp_options` (20 pts)** : Activation des options de topologie LLDP/CDP et lecture des tables ARP.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/snmp-discovery.yaml
```
