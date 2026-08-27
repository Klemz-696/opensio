# Validateur : Construction d'une Image Docker Sécurisée et Multi-Stage

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de conception d'un Dockerfile optimisé.

## Critères d'Évaluation (100 points)
1. **`multistage_structure_and_base_images` (25 pts)** : Multi-Stage Build avec `FROM ... AS builder` et image runtime.
2. **`builder_dependencies_and_compilation` (25 pts)** : Étape builder avec mise en cache (`package*.json`, `npm ci`) et `npm run build`.
3. **`production_stage_copy_and_env` (25 pts)** : Étape production avec `ENV NODE_ENV=production`, `COPY --from=builder` et `EXPOSE 3000`.
4. **`security_non_root_and_cmd_exec` (25 pts)** : Directive de sécurité non-root `USER node` et commande `CMD` au format exec JSON.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/Dockerfile
```
