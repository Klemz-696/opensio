# Validateur : Déploiement Automatisé d'une VM via Cloud-Init

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les jeux de tests (fixtures) pour l'atelier Cloud-Init sous Proxmox VE.

## Critères d'Évaluation (100 points)
1. **`header_and_syntax` (25 pts)** : Présence de l'en-tête `#cloud-config` et syntaxe YAML valide (nom d'hôte et FQDN).
2. **`users_and_security` (35 pts)** : Utilisateur `admin-sys` avec sudo sans mot de passe, shell bash et clé SSH autorisée.
3. **`packages_installed` (20 pts)** : Présence des paquets requis (`qemu-guest-agent`, `curl`, `htop`, `ufw`, `git`).
4. **`runcmd_and_hardening` (20 pts)** : Activation de l'agent QEMU et durcissement UFW (deny incoming, allow outgoing, allow 22/tcp, enable).

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/user-data
```
