# Validateur : Déploiement d'une Pile Multi-Services avec Docker Compose

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier d'orchestration multi-services sous Docker Compose.

## Critères d'Évaluation (100 points)
1. **`services_definitions_and_images` (25 pts)** : Déclaration des 4 services (proxy, backend, database, cache) et images associées.
2. **`networks_isolation_and_ports` (25 pts)** : Segmentation frontend/backend étanche et absence d'exposition publique sur la BDD.
3. **`volumes_persistence_and_restart` (25 pts)** : Persistance PostgreSQL par volume nommé `db_data` et politique `restart: unless-stopped`.
4. **`healthchecks_and_depends_on` (25 pts)** : Sondes de santé (`pg_isready`) et dépendances ordonnées `condition: service_healthy`.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/docker-compose.yml
```
