# Validateur : Configuration des Interfaces Réseau Proxmox (Bridges & VLANs)

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les jeux de tests (fixtures) pour l'atelier de configuration réseau Proxmox VE.

## Critères d'Évaluation (100 points)
1. **`loopback_and_physical` (25 pts)** : Loopback `lo` et interface physique `eno1` en mode `manual`.
2. **`public_bridge_vmbr0` (35 pts)** : Pont `vmbr0` avec adresse `192.168.10.250/24`, passerelle `192.168.10.254` et liaison physique `bridge-ports eno1`.
3. **`vlan_awareness` (20 pts)** : Activation de `bridge-vlan-aware yes` sur `vmbr0`.
4. **`isolated_bridge_vmbr1` (20 pts)** : Pont privé isolé `vmbr1` avec adresse `10.0.0.254/24` et `bridge-ports none`.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/interfaces
```
