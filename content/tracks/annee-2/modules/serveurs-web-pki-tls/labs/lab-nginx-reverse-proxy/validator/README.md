# Validateur — Lab « Reverse Proxy Nginx »

Script de validation du lab `configuration-nginx-reverse-proxy` (niveau `2_files`).
Exécuté par le runner OpenSIO dans le bac à sable de la session ; analyse statique des
fichiers de l'étudiant, sans dépendance externe (Node.js pur).

## Contrôles (100 points)

| ID | Points | Description |
|---|---|---|
| `http_to_https_redirect` | 25 | Bloc `server` port 80 + `return 301 https://` |
| `upstream_load_balancing` | 25 | `upstream opensio_backend` avec `least_conn`, 2 backends et `max_fails/fail_timeout` |
| `proxy_headers_transmission` | 25 | `proxy_set_header` : `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` |
| `proxy_pass_persistence` | 25 | `proxy_pass http://opensio_backend`, `proxy_http_version 1.1`, `Connection ""` |

Les quatre contrôles sont `required: true` : un seul échec bloque le lab (statut `FAILED`).

## Sortie

Le script imprime un verdict JSON conforme au contrat OpenSIO :

```json
{
  "passed": true,
  "score": 100,
  "checks": [{ "id": "...", "passed": true, "points": 25, "message": "..." }]
}
```

## Jeux d'essais (`solutions/`)

- `valid/` : configuration complète (les 4 contrôles passent, score 100) ;
- `invalid-no-headers/` : en-têtes client absents → contrôle 3 échoue ;
- `invalid-single-backend/` : upstream mono-backend sans `least_conn` → contrôle 2 échoue.

Exécution locale :

```bash
cd content/tracks/annee-2/modules/serveurs-web-pki-tls/labs/lab-nginx-reverse-proxy/validator
WORK_DIR=./solutions/valid node validate.mjs
```