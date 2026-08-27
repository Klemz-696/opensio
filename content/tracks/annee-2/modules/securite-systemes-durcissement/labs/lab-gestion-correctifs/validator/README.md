# Validateur : Mise en Place d'une Stratégie de Patch Management et Mises à Jour Automatisées

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de patch management automatisé sous Linux.

## Critères d'Évaluation (100 points)
1. **`security_repositories_and_blacklist` (25 pts)** : Dépôts restreints à `-security` et déclaration de la liste noire de paquets.
2. **`reboot_and_cleanup_policy` (25 pts)** : Redémarrage automatique planifié en fenêtre nocturne et nettoyage des dépendances.
3. **`periodic_update_and_download` (25 pts)** : Mise à jour quotidienne de l'index et pré-téléchargement des correctifs.
4. **`periodic_upgrade_and_autoclean` (25 pts)** : Application automatique quotidienne et nettoyage hebdomadaire du cache apt.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire
```
