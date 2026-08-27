# Validateur : Conception d'un Pipeline CI/CD Complet (GitHub Actions)

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de création d'un pipeline CI/CD GitHub Actions.

## Critères d'Évaluation (100 points)
1. **`triggers_and_jobs_structure` (25 pts)** : Déclencheurs `push` et `pull_request` sur la branche `main` et déclaration des jobs `test` et `deploy` sur `ubuntu-latest`.
2. **`test_job_steps_and_cache` (25 pts)** : Job test avec `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run lint` et `npm test`.
3. **`deploy_job_needs_and_condition` (25 pts)** : Job deploy avec dépendance séquentielle `needs: test` et conditionnement d'exécution.
4. **`artifacts_and_secrets_security` (25 pts)** : Téléversement des artefacts compilés (`actions/upload-artifact@v4`) et injection sécurisée des secrets (`${{ secrets. ... }}`).

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/deploy.yml
```
