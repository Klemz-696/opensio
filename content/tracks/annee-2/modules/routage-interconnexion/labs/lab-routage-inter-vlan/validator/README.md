# Validateur : Configuration et Déploiement du Routage Inter-VLAN (RoaS & SVI)

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de routage inter-VLAN sous Cisco IOS.

## Critères d'Évaluation (100 points)
1. **`roas_subinterfaces_encapsulation` (25 pts)** : Sous-interfaces RoaS (`.10`, `.20`, `.30`) avec `encapsulation dot1Q` et adresses IP `.254`.
2. **`switch_l3_ip_routing_and_vlans` (25 pts)** : Commande globale `ip routing` et création des VLANs 10, 20 et 30.
3. **`switch_l3_svi_configuration` (25 pts)** : Interfaces virtuelles SVI (`interface Vlan10`, `Vlan20`, `Vlan30`) avec leurs passerelles.
4. **`trunk_ports_and_descriptions` (25 pts)** : Configuration du port Trunk 802.1Q (`switchport mode trunk`) et activation `no shutdown`.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/intervlan.ios
```
