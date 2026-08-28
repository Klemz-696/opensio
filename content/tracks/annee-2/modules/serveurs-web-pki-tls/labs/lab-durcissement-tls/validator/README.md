# Validateur — Lab « Durcissement TLS d'un Serveur Web Vulnérable »

Script de validation du lab `durcissement-configuration-tls` (niveau `2_files`).
Analyse statique de la configuration TLS Nginx et du fichier d'en-têtes de sécurité.
Node.js pur, sans dépendance externe.

## Contrôles (100 points)

| ID | Points | Description |
|---|---|---|
| `tls_protocols_hardened` | 25 | `ssl_protocols TLSv1.2 TLSv1.3`, aucune trace de SSLv3/TLSv1/TLSv1.1 hors commentaires |
| `cipher_suites_strong` | 25 | Suites ECDHE + AEAD (GCM/ChaCha20), exclusion RC4/3DES/DES-CBC/MD5 |
| `security_headers_present` | 25 | HSTS ≥ 6 mois avec `includeSubDomains`, `nosniff`, `X-Frame-Options: DENY` |
| `https_redirect_and_stapling` | 25 | Redirection 301 port 80, `ssl_stapling on` + `ssl_stapling_verify on`, tickets off |

Les quatre contrôles sont `required: true`.

## Jeux d'essais (`solutions/`)

- `valid/` : configuration durcie complète (score 100) ;
- `invalid-legacy-protocols/` : TLSv1.1 conservé → contrôle 1 échoue ;
- `invalid-weak-ciphers/` : suites RC4/3DES subsistantes → contrôle 2 échoue.

Exécution locale :

```bash
cd content/tracks/annee-2/modules/serveurs-web-pki-tls/labs/lab-durcissement-tls/validator
WORK_DIR=./solutions/valid node validate.mjs
```