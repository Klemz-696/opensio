# Validateur : Script de Sauvegarde Automatisée avec rsync et Contrôle SHA-256

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de script de sauvegarde sous Linux.

## Critères d'Évaluation (100 points)
1. **`bash_header_and_safety` (20 pts)** : Shebang `#!/bin/bash` et mode strict (`set -euo pipefail` ou `set -e`).
2. **`rsync_options_and_sync` (30 pts)** : Commande `rsync` avec options `-a`, `--delete` et `--exclude`.
3. **`sha256_integrity_check` (25 pts)** : Empreinte de contrôle générée avec `sha256sum` et écrite dans un fichier de hash.
4. **`rotation_and_logging` (25 pts)** : Purge des sauvegardes anciennes via `find` (`-mtime`) et journalisation dans `backup.log`.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/backup.sh
```
