# Validateur du Lab — Déploiement d'une maquette de services réseau DNS et DHCP

Ce répertoire contient le script de validation automatique du lab **Maquette DNS/DHCP** (niveau 2 — fichiers), conformément au contrat de validation OpenSIO (§26.3 et §53 Annexe D).

## Contrôles effectués

Le validateur analyse le fichier `dnsmasq.conf` placé dans le répertoire de travail et évalue 4 critères :

1. **`dns_config_valid` (35 points, obligatoire)** :
   - Vérifie la configuration du domaine `agence.local`.
   - Vérifie la présence des enregistrements statiques pour `srv-app.agence.local` (192.168.50.10) et `gw.agence.local` (192.168.50.254).

2. **`dhcp_scope_valid` (35 points, obligatoire)** :
   - Vérifie la directive `dhcp-range` configurant la plage 192.168.50.100 à 192.168.50.200, le masque 255.255.255.0 et une durée de bail valide (12h ou 24h).

3. **`dhcp_options_valid` (20 points, obligatoire)** :
   - Vérifie la distribution de la passerelle par défaut (Option 3 / router : 192.168.50.254).
   - Vérifie la distribution du serveur DNS (Option 6 / dns-server : 192.168.50.254).
   - Vérifie la distribution du nom de domaine (Option 15 / domain-name : agence.local).

4. **`static_reservation_valid` (10 points, optionnel/bonus)** :
   - Vérifie la réservation DHCP statique `dhcp-host` pour l'imprimante (MAC `00:11:22:33:44:55` -> IP `192.168.50.20`).

## Format de sortie

```json
{
  "passed": true,
  "score": 100,
  "checks": [
    { "id": "dns_config_valid", "passed": true, "points": 35, "message": "Configuration DNS locale conforme..." },
    { "id": "dhcp_scope_valid", "passed": true, "points": 35, "message": "Plage d'adresses DHCP 192.168.50.100-200 valide..." },
    { "id": "dhcp_options_valid", "passed": true, "points": 20, "message": "Options DHCP 3, 6 et 15 configurées..." },
    { "id": "static_reservation_valid", "passed": true, "points": 10, "message": "Réservation statique de l'imprimante opérationnelle..." }
  ]
}
```
