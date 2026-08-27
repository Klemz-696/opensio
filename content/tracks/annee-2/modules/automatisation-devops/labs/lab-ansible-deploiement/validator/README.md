# Validateur : Déploiement et Configuration Idempotente d'un Serveur Web avec Ansible

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier d'automatisation avec Ansible.

## Critères d'Évaluation (100 points)
1. **`play_header_and_privileges` (25 pts)** : Déclaration de `hosts: webservers` et élévation de privilèges `become: true`.
2. **`package_installation_and_service` (25 pts)** : Installation du paquet avec le module `apt` et gestion du service `systemd` (`started`, `enabled`).
3. **`template_vhost_and_symlink` (25 pts)** : Déploiement du template vers `sites-available/app.conf` et activation via lien symbolique dans `sites-enabled`.
4. **`handlers_and_cleanup_default` (25 pts)** : Suppression de `sites-enabled/default` (`state: absent`) et déclaration du handler (`state: reloaded`).

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/playbook.yml
```
