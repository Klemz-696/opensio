# Validateur : Configuration d'un Pare-feu Périmétrique avec État (nftables)

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de configuration du pare-feu avec état sous Linux nftables.

## Critères d'Évaluation (100 points)
1. **`nftables_structure_and_flush` (25 pts)** : Directive `flush ruleset`, tables `inet filter` et `ip nat`.
2. **`input_chain_stateful_and_ssh` (25 pts)** : Chaîne `input` en policy drop, boucle locale, protection invalid, established/related et SSH LAN.
3. **`forward_chain_zones_and_dmz_rules` (25 pts)** : Chaîne `forward` en policy drop, flux LAN->WAN et WAN->DMZ (80/443), absence de fuite DMZ->LAN.
4. **`nat_dnat_and_masquerade` (25 pts)** : Redirection DNAT vers l'adresse DMZ `192.168.50.10` et Masquerade sortant sur eth1.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/nftables.conf
```
