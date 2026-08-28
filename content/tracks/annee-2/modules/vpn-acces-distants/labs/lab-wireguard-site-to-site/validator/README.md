# Validateur — Lab « Tunnel WireGuard Site-à-Site »

Script de validation du lab `configuration-wireguard-site-to-site` (niveau `2_files`).
Analyse statique des configurations des deux passerelles. Node.js pur, sans dépendance.

## Contrôles (100 points)

| ID | Points | Description |
|---|---|---|
| `interfaces_well_formed` | 25 | `[Interface]` : `Address` 10.99.0.1/24 et 10.99.0.2/24, `ListenPort 51820`, `PrivateKey` concrète |
| `peers_declared` | 25 | `[Peer]` croisés avec `PublicKey` concrète et `Endpoint` IP:51820 |
| `allowed_ips_routing` | 25 | Siège : `10.99.0.2/32, 192.168.20.0/24` ; filiale : `10.99.0.1/32, 192.168.10.0/24` |
| `forwarding_and_keepalive` | 25 | `PostUp` iptables FORWARD sur wg0 des deux côtés + `PersistentKeepalive = 25` filiale |

Les quatre contrôles sont `required: true`.

## Jeux d'essais (`solutions/`)

- `valid/` : configurations croisées complètes (score 100) ;
- `invalid-missing-route/` : `AllowedIPs` filiale sans le LAN siège → contrôle 3 échoue ;
- `invalid-no-endpoint/` : `Endpoint` absent du peer filiale → contrôle 2 échoue.

Exécution locale :

```bash
cd content/tracks/annee-2/modules/vpn-acces-distants/labs/lab-wireguard-site-to-site/validator
WORK_DIR=./solutions/valid node validate.mjs
```