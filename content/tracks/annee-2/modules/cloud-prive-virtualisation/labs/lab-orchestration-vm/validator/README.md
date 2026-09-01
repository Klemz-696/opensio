# Validateur : Orchestration et Provisionnement Automatisé de VMs avec Cloud-Init

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier d'orchestration de machines virtuelles KVM et Cloud-Init.

## Critères d'Évaluation (100 points)
1. **`cloud_init_header_and_users` (25 pts)** : Entête `#cloud-config`, hostname et utilisateur devops avec clé SSH.
2. **`cloud_init_packages_and_runcmd` (25 pts)** : Installation des paquets (`qemu-guest-agent`, `nginx`) et activation des services.
3. **`vm_cloning_and_hardware_specs` (25 pts)** : Template parent, mode clone lié (`clone_mode: linked`) et ressources CPU/RAM/Disque.
4. **`vm_network_and_snapshot_policy` (25 pts)** : Attachement au VNet SDN et politique de snapshot initial.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire
```
