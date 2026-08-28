# Validateur — Lab « Serveur OpenVPN Nomade »

Script de validation du lab `deploiement-openvpn-nomade` (niveau `2_files`).
Analyse statique de la configuration serveur et du profil client (lignes actives
uniquement, commentaires ignorés). Node.js pur, sans dépendance externe.

## Contrôles (100 points)

| ID | Points | Description |
|---|---|---|
| `server_transport_tun` | 25 | `port 1194`, `proto udp`, `dev tun`, `server 10.8.0.0 255.255.255.0` |
| `pki_and_tls_crypt` | 25 | `ca`/`cert`/`key`, `dh none`, `tls-crypt` |
| `modern_crypto` | 25 | `tls-version-min 1.2`, `data-ciphers` AEAD, sans BF-CBC/DES |
| `push_and_client_profile` | 25 | `push route 192.168.10.0/24` + `push dhcp-option DNS` + profil client (`client`, `remote`, `dev tun`) |

Les quatre contrôles sont `required: true`.

## Jeux d'essais (`solutions/`)

- `valid/` : serveur et profil complets (score 100) ;
- `invalid-legacy-cipher/` : `data-ciphers` contenant BF-CBC → contrôle 3 échoue ;
- `invalid-missing-push/` : route LAN non poussée → contrôle 4 échoue.

Exécution locale :

```bash
cd content/tracks/annee-2/modules/vpn-acces-distants/labs/lab-openvpn-nomade/validator
WORK_DIR=./solutions/valid node validate.mjs
```