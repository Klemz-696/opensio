# Validateur — Lab « CA Racine d'Entreprise et Certificat SAN avec OpenSSL »

Script de validation du lab `generation-certificats-pki-openssl` (niveau `2_files`).
Analyse statique du script de génération PKI et du fichier d'extensions SAN.
Node.js pur, sans dépendance externe.

## Contrôles (100 points)

| ID | Points | Description |
|---|---|---|
| `ca_key_and_certificate` | 25 | Clé CA `-aes256` 4096 bits, `req -x509`, 3650 jours, `CA:TRUE` |
| `server_key_and_csr` | 25 | Clé serveur 2048 bits + CSR `opensio.home.lan.csr` |
| `san_multi_domain` | 25 | `CA:FALSE`, `serverAuth`, SAN avec ≥ 2 noms DNS |
| `server_cert_signature` | 25 | `x509 -req -CA ... -sha256`, validité ≤ 825 jours, `-extfile` |

Les quatre contrôles sont `required: true`.

## Jeux d'essais (`solutions/`)

- `valid/` : script complet et SAN complet (score 100) ;
- `invalid-missing-san/` : SAN limité à un seul nom DNS → contrôle 3 échoue ;
- `invalid-long-validity/` : certificat serveur signé pour 3650 jours → contrôle 4 échoue.

Exécution locale :

```bash
cd content/tracks/annee-2/modules/serveurs-web-pki-tls/labs/lab-pki-openssl/validator
WORK_DIR=./solutions/valid node validate.mjs
```