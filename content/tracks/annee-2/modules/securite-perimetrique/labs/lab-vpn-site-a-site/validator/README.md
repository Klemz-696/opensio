# Validateur : Déploiement d'un Tunnel VPN Site-à-Site WireGuard

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de configuration du tunnel WireGuard.

## Critères d'Évaluation (100 points)
1. **`interface_address_and_listenport` (25 pts)** : Section `[Interface]` avec `Address = 10.100.0.1/30`, `ListenPort = 51820` et clé privée.
2. **`peer_publickey_and_endpoint` (25 pts)** : Section `[Peer]` avec `PublicKey` et `Endpoint = 198.51.100.20:51820`.
3. **`allowed_ips_remote_networks` (25 pts)** : `AllowedIPs` incluant `10.100.0.2/32` et le sous-réseau `192.168.20.0/24`.
4. **`persistent_keepalive_nat` (25 pts)** : Directive de maintien d'état `PersistentKeepalive = 25`.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/wg0.conf
```
