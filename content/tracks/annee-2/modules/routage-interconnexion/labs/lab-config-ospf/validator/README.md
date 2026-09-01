# Validateur : Déploiement et Optimisation du Routage Dynamique OSPFv2

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de configuration du protocole de routage OSPFv2 sous FRRouting / Linux.

## Critères d'Évaluation (100 points)
1. **`router_id_and_reference_bandwidth` (25 pts)** : Router-ID `10.255.255.1` et `auto-cost reference-bandwidth 100000`.
2. **`ospf_area0_network_advertisements` (25 pts)** : Déclaration des réseaux `10.0.0.0/30`, `10.0.0.4/30`, `192.168.100.0/24` et Loopback dans `area 0`.
3. **`interface_costs_and_metrics` (25 pts)** : Coûts métriques `ip ospf cost 10` sur eth1 et `ip ospf cost 100` sur eth2.
4. **`passive_interface_and_default_originate` (25 pts)** : `passive-interface eth0` et propagation de route par défaut `default-information originate`.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/frr.conf
```
