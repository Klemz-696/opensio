---
slug: adressage-ipv4
title: "Adressage IPv4 : classes, masques et notation CIDR"
version: 1.0.0
last_reviewed: "2026-08-24"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Convertir une adresse IPv4 en binaire et décimal"
  - "Calculer un masque de sous-réseau en notation CIDR"
  - "Déterminer l'adresse réseau, l'adresse de diffusion (broadcast) et la plage d'hôtes"
prerequisites: []
competency_refs:
  - "B2.1"
success_criteria:
  - "Réussir le quiz 'Adressage IPv4' avec au moins 80 %"
  - "Compléter le lab 'Plan d'adressage d'une PME'"
labs:
  - slug: plan-adressage-pme
    required: true
references:
  - label: "RFC 791 — Internet Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc791"
  - label: "RFC 1918 — Address Allocation for Private Internets"
    url: "https://www.rfc-editor.org/rfc/rfc1918"
---

# Adressage IPv4 : Fondamentaux et Calcul de Sous-Réseaux

L'adressage IPv4 constitue le socle des communications sur les réseaux locaux et l'Internet. Comprendre la structure d'une adresse, le rôle du masque de sous-réseau et la notation CIDR est indispensable pour concevoir des plans d'adressage et diagnostiquer des problèmes d'interconnexion.

---

## 1. Structure d'une adresse IPv4

Une adresse IPv4 est un identifiant logique sur **32 bits**, généralement représenté sous forme décimale pointée en 4 octets (de 0 à 255).

```
Format décimal : 192.168.1.10
Format binaire : 11000000 . 10101000 . 00000001 . 00001010
```

Une adresse IPv4 est toujours découpée en deux parties :
1. **La partie réseau (NetID)** : identifie le réseau auquel appartient l'équipement.
2. **La partie hôte (HostID)** : identifie l'équipement spécifique sur ce réseau.

### Exemple de conversion en script

```bash
# Conversion rapide décimal -> binaire avec Python
python3 -c "print('.'.join(f'{int(octet):08b}' for octet in '192.168.1.10'.split('.')))"
```

---

## 2. Le masque de sous-réseau et la notation CIDR

Le masque de sous-réseau indique la frontière exacte entre la partie réseau et la partie hôte :
- Les bits à **1** du masque désignent les bits du réseau.
- Les bits à **0** du masque désignent les bits des hôtes.

### Notation CIDR (Classless Inter-Domain Routing)

La notation CIDR indique le nombre de bits consécutifs à 1 dans le masque (ex : `/24` correspond à 24 bits à 1).

| Préfixe CIDR | Masque décimal | Nombre total d'adresses ($2^H$) | Hôtes utilisables ($2^H - 2$) |
|---|---|---|---|
| `/24` | `255.255.255.0` | 256 | 254 |
| `/26` | `255.255.255.192` | 64 | 62 |
| `/27` | `255.255.255.224` | 32 | 30 |
| `/28` | `255.255.255.240` | 16 | 14 |
| `/30` | `255.255.255.252` | 4 | 2 (liaison point-à-point) |

---

## 3. Déterminer Réseau, Broadcast et Plage d'Hôtes

Pour un réseau donné (ex: `192.168.1.77/26`) :

1. **Taille de bloc** : $256 - 192 = 64$.
2. **Multiples de 64** : 0, 64, 128, 192...
3. Comme $77 \in [64, 127]$ :
   - **Adresse Réseau** : `192.168.1.64` (tous les bits hôtes à 0).
   - **Première adresse utilisable** : `192.168.1.65`.
   - **Dernière adresse utilisable** : `192.168.1.126`.
   - **Adresse de Diffusion (Broadcast)** : `192.168.1.127` (tous les bits hôtes à 1).

---

## 4. Plages d'adresses privées (RFC 1918)

Pour éviter la pénurie d'adresses publiques sur Internet, trois plages privées sont réservées aux réseaux locaux (non routables sur Internet) :

- **Classe A** : `10.0.0.0/8` (`10.0.0.0` à `10.255.255.255`)
- **Classe B** : `172.16.0.0/12` (`172.16.0.0` à `172.31.255.255`)
- **Classe C** : `192.168.0.0/16` (`192.168.0.0` à `192.168.255.255`)

---

## 5. Commandes utiles de diagnostic

Sous Linux / Debian :

```bash
# Afficher les adresses configurées et les masques CIDR
ip -br address show

# Vérifier la table de routage
ip route show

# Tester la joignabilité d'une adresse
ping -c 4 192.168.1.1
```
