# Validateur : Durcissement Automatisé d'un Serveur Linux avec Ansible et Sysctl

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de durcissement système sous Linux.

## Critères d'Évaluation (100 points)
1. **`ssh_hardening_playbook_tasks` (25 pts)** : Configuration SSH sécurisée (PermitRootLogin no, PasswordAuthentication no) et handler de rechargement.
2. **`security_services_installation` (25 pts)** : Installation et activation des paquets de sécurité (auditd, ufw).
3. **`sysctl_network_protection` (25 pts)** : Protection réseau noyau (SYN Cookies, rp_filter, ICMP redirects, ip_forward).
4. **`sysctl_kernel_memory_protection` (25 pts)** : Randomisation ASLR et déploiement sysctl dans le playbook.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire
```
