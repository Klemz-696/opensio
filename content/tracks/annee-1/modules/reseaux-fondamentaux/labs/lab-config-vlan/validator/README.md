# Validateur du Lab — Configuration et segmentation par VLAN sur commutateur d'entreprise

Ce répertoire contient le script de validation automatique du lab **Configuration et segmentation par VLAN** (niveau 2 — fichiers), conformément au contrat de validation OpenSIO (§26.3 et §53 Annexe D).

## Contrôles effectués

Le validateur analyse le fichier `switch.cfg` placé dans le répertoire de travail et évalue 4 critères :

1. **`vlan_db_valid` (30 points, obligatoire)** :
   - Vérifie la création des VLANs 10 (Direction), 20 (Commercial), 30 (Technique) et 99 (Administration).

2. **`access_ports_valid` (35 points, obligatoire)** :
   - Vérifie que les ports d'accès Fa0/1-4 sont affectés au VLAN 10 en mode access.
   - Vérifie que les ports d'accès Fa0/5-8 sont affectés au VLAN 20 en mode access.
   - Vérifie que les ports d'accès Fa0/9-12 sont affectés au VLAN 30 en mode access.

3. **`trunk_configured` (25 points, obligatoire)** :
   - Vérifie que le port Gi0/1 est configuré en mode trunk 802.1Q.
   - Vérifie que le VLAN natif est fixé sur le VLAN 99.
   - Vérifie le filtrage strict des VLANs autorisés (10, 20, 30, 99).

4. **`management_configured` (10 points, optionnel/bonus)** :
   - Vérifie la configuration de l'interface SVI VLAN 99 (`ip address 192.168.99.2 255.255.255.0`).
   - Vérifie la définition de la passerelle par défaut (`ip default-gateway 192.168.99.1`).

## Format de sortie

```json
{
  "passed": true,
  "score": 100,
  "checks": [
    { "id": "vlan_db_valid", "passed": true, "points": 30, "message": "VLANs 10, 20, 30 et 99 correctement définis..." },
    { "id": "access_ports_valid", "passed": true, "points": 35, "message": "Ports d'accès correctement affectés..." },
    { "id": "trunk_configured", "passed": true, "points": 25, "message": "Port Trunk Gi0/1 conforme..." },
    { "id": "management_configured", "passed": true, "points": 10, "message": "SVI VLAN 99 et passerelle configurées..." }
  ]
}
```
