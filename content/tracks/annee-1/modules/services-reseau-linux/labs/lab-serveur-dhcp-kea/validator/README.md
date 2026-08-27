# Validateur — Déploiement et configuration d'un serveur DHCP Kea

## Contrôles effectués

1. **`json_structure_and_globals_valid` (30 points, requis)** :
   - Structure JSON valide avec bloc `Dhcp4`.
   - `interfaces: ["eth0"]`
   - `lease-database` de type `memfile`
   - `valid-lifetime: 86400`

2. **`subnet_and_pool_valid` (40 points, requis)** :
   - Sous-réseau `192.168.20.0/24`.
   - Pool dynamique `192.168.20.50 - 192.168.20.200`.

3. **`options_and_reservation_valid` (30 points, requis)** :
   - Option `routers` : `192.168.20.254`
   - Option `domain-name-servers` : incluant `192.168.20.10`
   - Option `domain-name` : `prod.entreprise.lan`
   - Réservation MAC `00:11:22:33:44:55` -> IP `192.168.20.15`

Score maximal : **100 points**. Seuil : **80 %** et tous les contrôles obligatoires validés.
