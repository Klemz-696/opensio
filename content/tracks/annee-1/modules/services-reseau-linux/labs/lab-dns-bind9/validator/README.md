# Validateur — Déploiement et sécurisation d'un serveur DNS Bind9

## Contrôles effectués

1. **`zone_declarations_valid` (25 points, requis)** :
   - Présence de la zone directe `societe.lan` en `type master;` vers `db.societe.lan`.
   - Présence de la zone inverse `10.168.192.in-addr.arpa` en `type master;` vers `db.192.168.10`.

2. **`forward_records_valid` (45 points, requis)** :
   - En-tête SOA avec `ns1.societe.lan.` et `admin.societe.lan.`, numéro de série YYYYMMDDNN.
   - Enregistrements NS `ns1.societe.lan.` et `ns2.societe.lan.`.
   - Enregistrement MX `10 mail.societe.lan.`.
   - Hôtes A : `ns1` (192.168.10.10), `ns2` (192.168.10.11), `mail` (192.168.10.15), `srv-web` (192.168.10.20), `srv-db` (192.168.10.30).
   - Alias CNAME : `www` et `intranet` vers `srv-web.societe.lan.`.

3. **`reverse_records_valid` (30 points, requis)** :
   - SOA et NS conformes.
   - Pointeurs PTR : 10 (`ns1`), 11 (`ns2`), 15 (`mail`), 20 (`srv-web`), 30 (`srv-db`).

Score maximal : **100 points**. Seuil : **80 %** et tous les contrôles obligatoires validés.
