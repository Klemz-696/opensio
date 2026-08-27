# Validateur — Sécurisation de l'arborescence FHS et matrice des permissions

## Contrôles effectués

1. **`ownership_valid` (30 points, requis)** :
   - `/var/www/html` : `www-data:www-data`
   - `/data/partages/comptabilite` : `root:compta`
   - `/data/partages/technique` : `root:technique`
   - `/data/partages/commun` : `root:users`
   - `/etc/ssl/private` : `root:ssl-cert`

2. **`standard_permissions_valid` (40 points, requis)** :
   - `/var/www/html` : `755`
   - `/data/partages/comptabilite` : `770`
   - `/data/partages/technique` : `770`
   - `/data/partages/commun` : `777`
   - `/etc/ssl/private` : `710`

3. **`special_bits_valid` (30 points, requis)** :
   - Bit SGID (`2xxx`) sur `/data/partages/comptabilite` et `/data/partages/technique`.
   - Sticky Bit (`1xxx`) sur `/data/partages/commun`.
   - Aucun bit spécial (`0xxx`) sur les autres répertoires.

Score total maximal : **100 points**. Seuil de validation : **80 %** et tous les contrôles obligatoires validés.
