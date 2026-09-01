# Validateur — Configuration du stockage LVM et points de montage fstab

## Contrôles effectués

1. **`mountpoints_and_types_valid` (35 points, requis)** :
   - `/` : `ext4`
   - `/boot` : `ext4`
   - `/var/www` : `ext4`
   - `/tmp` : `ext4`
   - `/var/lib/postgresql` : `xfs`
   - `swap` : `swap`

2. **`uuids_declared` (30 points, requis)** :
   - Présence de la syntaxe `UUID=<id>` pour les 6 lignes avec les identifiants demandés.

3. **`security_options_and_fsck_valid` (35 points, requis)** :
   - `/tmp` : `nodev,nosuid,noexec`
   - `/var/www` : `nodev,nosuid`
   - `/var/lib/postgresql` : `nodev`
   - Ordre fsck : 1 pour `/`, 2 pour les autres partitions, 0 pour `swap`.

Score maximal : **100 points**. Seuil : **80 %** et tous les contrôles obligatoires validés.
