---
slug: subnetting-vlsm
title: "Subnetting et VLSM : optimisation du découpage d'adresses IPv4"
version: 1.0.0
last_reviewed: "2026-08-25"
difficulty: 3
estimated_minutes: 60
objectives:
  - "Comprendre les limites du découpage à masque fixe (FLSM) et l'intérêt du VLSM"
  - "Appliquer la méthode de calcul VLSM étape par étape sans gaspillage d'adresses"
  - "Calculer les préfixes optimaux pour des réseaux locaux et des liaisons point-à-point"
  - "Déterminer l'adresse réseau, la première adresse utile, la dernière adresse utile et le broadcast de chaque sous-réseau"
  - "Concevoir un plan d'adressage hiérarchique exempt de tout chevauchement"
prerequisites:
  - "adressage-ipv4"
competency_refs:
  - "B2.1"
  - "B2.2"
success_criteria:
  - "Réussir le quiz 'Subnetting et VLSM' avec au moins 80 %"
  - "Compléter l'atelier pratique 'Plan VLSM complet'"
labs:
  - slug: plan-vlsm-complet
    required: true
references:
  - label: "RFC 1878 — Variable Length Subnet Table For IPv4"
    url: "https://www.rfc-editor.org/rfc/rfc1878"
  - label: "RFC 4632 — Classless Inter-domain Routing (CIDR)"
    url: "https://www.rfc-editor.org/rfc/rfc4632"
---

# Subnetting et VLSM : Découpage Avancé et Optimisation IPv4

Le découpage en sous-réseaux à longueur variable (**VLSM** — _Variable Length Subnet Masking_) permet d'allouer des masques de sous-réseau de tailles différentes à chaque segment d'un même réseau principal. Cette méthode supprime le gaspillage massif d'adresses inhérent au découpage à masque fixe (**FLSM** — _Fixed Length Subnet Masking_).

---

## 1. Pourquoi le VLSM est-il Indispensable ?

Dans une approche **FLSM**, si un réseau principal `192.168.1.0/24` est découpé avec un masque unique `/26` (blocs de 64 adresses) :
- Un service nécessitant 50 postes consomme 1 sous-réseau `/26` (62 hôtes $\rightarrow$ adapté).
- Une liaison routeur à routeur (nécessitant seulement 2 adresses) consomme également un bloc `/26` complet $\rightarrow$ **60 adresses sont gaspillées**.

Le **VLSM** permet d'attribuer un `/26` au premier service, un `/28` à un petit service de 10 postes, et un `/30` (4 adresses au total, 2 hôtes utiles) à la liaison point-à-point.

---

## 2. Méthodologie Rigoureuse du Calcul VLSM

Pour réussir un découpage VLSM sans collision ni chevauchement, respectez scrupuleusement les 4 étapes suivantes :

### Étape 1 : Classer les besoins par ordre décroissant
Triez tous les sous-réseaux demandés du **plus grand nombre d'adresses hôtes au plus petit**. Terminez toujours par les liaisons inter-routeurs point-à-point (2 hôtes utiles).

### Étape 2 : Déterminer le nombre de bits d'hôtes $H$ et le préfixe $P$
Pour chaque besoin de $N$ hôtes, trouvez la plus petite puissance de 2 telle que :
$$2^H - 2 \ge N$$

Le préfixe CIDR correspondant est alors :
$$P = 32 - H$$

| Hôtes demandés ($N$) | Bits hôtes ($H$) | Taille du bloc ($2^H$) | Hôtes utiles ($2^H - 2$) | Préfixe CIDR ($P$) | Masque décimal |
|---|---|---|---|---|---|
| 500 à 1022 | 10 | 1024 | 1022 | `/22` | `255.255.252.0` |
| 250 à 510 | 9 | 512 | 510 | `/23` | `255.255.254.0` |
| 120 à 254 | 8 | 256 | 254 | `/24` | `255.255.255.0` |
| 60 à 126 | 7 | 128 | 126 | `/25` | `255.255.255.128` |
| 30 à 62 | 6 | 64 | 62 | `/26` | `255.255.255.192` |
| 15 à 30 | 5 | 32 | 30 | `/27` | `255.255.255.224` |
| 7 à 14 | 4 | 16 | 14 | `/28` | `255.255.255.240` |
| 3 à 6 | 3 | 8 | 6 | `/29` | `255.255.255.248` |
| 2 (Point-à-point) | 2 | 4 | 2 | `/30` | `255.255.255.252` |

### Étape 3 : Calculer l'incrément (Le Pas)
Pour chaque sous-réseau, le « pas » est égal à la taille totale du bloc ($2^H$). L'adresse réseau suivante commence immédiatement après l'adresse de diffusion (broadcast) du sous-réseau précédent :
$$\text{Réseau suivant} = \text{Réseau actuel} + \text{Pas}$$

### Étape 4 : Renseigner les bornes du sous-réseau
- **Adresse réseau** : Début du bloc ($H$ bits à 0).
- **Première adresse hôte** : $\text{Adresse réseau} + 1$.
- **Dernière adresse hôte** : $\text{Adresse broadcast} - 1$.
- **Adresse de diffusion (Broadcast)** : $\text{Adresse réseau} + \text{Pas} - 1$ ($H$ bits à 1).

---

## 3. Exemple Corrigé 1 : Réseau de PME sur bloc `192.168.10.0/24`

### Énoncé :
Une entreprise dispose du bloc `192.168.10.0/24` (256 adresses) et doit créer 4 sous-réseaux :
- **VLAN 10 — Développement** : 55 postes
- **VLAN 20 — Commercial** : 26 postes
- **VLAN 30 — Direction** : 10 postes
- **Liaison R1-R2** : 2 routeurs (point-à-point)

### Résolution étape par étape :

1. **Développement (55 postes)** :
   - $2^H - 2 \ge 55 \rightarrow H = 6$ ($2^6 - 2 = 62$).
   - Préfixe : $32 - 6 = /26$. Pas : $64$.
   - **Réseau** : `192.168.10.0/26`
   - **Plage hôtes** : `192.168.10.1` à `192.168.10.62`
   - **Broadcast** : `192.168.10.63`

2. **Commercial (26 postes)** :
   - $2^H - 2 \ge 26 \rightarrow H = 5$ ($2^5 - 2 = 30$).
   - Préfixe : $32 - 5 = /27$. Pas : $32$.
   - **Réseau** : `192.168.10.64/27`
   - **Plage hôtes** : `192.168.10.65` à `192.168.10.94`
   - **Broadcast** : `192.168.10.95`

3. **Direction (10 postes)** :
   - $2^H - 2 \ge 10 \rightarrow H = 4$ ($2^4 - 2 = 14$).
   - Préfixe : $32 - 4 = /28$. Pas : $16$.
   - **Réseau** : `192.168.10.96/28`
   - **Plage hôtes** : `192.168.10.97` à `192.168.10.110`
   - **Broadcast** : `192.168.10.111`

4. **Liaison R1-R2 (2 postes)** :
   - $2^H - 2 \ge 2 \rightarrow H = 2$ ($2^2 - 2 = 2$).
   - Préfixe : $32 - 2 = /30$. Pas : $4$.
   - **Réseau** : `192.168.10.112/30`
   - **Plage hôtes** : `192.168.10.113` à `192.168.10.114`
   - **Broadcast** : `192.168.10.115`

### Bilan récapitulatif :

| Service | Besoin | Préfixe | Masque décimal | Adresse Réseau | 1ère Adresse | Dernière Adresse | Broadcast |
|---|---|---|---|---|---|---|---|
| Développement | 55 | `/26` | `255.255.255.192` | `192.168.10.0` | `192.168.10.1` | `192.168.10.62` | `192.168.10.63` |
| Commercial | 26 | `/27` | `255.255.255.224` | `192.168.10.64` | `192.168.10.65` | `192.168.10.94` | `192.168.10.95` |
| Direction | 10 | `/28` | `255.255.255.240` | `192.168.10.96` | `192.168.10.97` | `192.168.10.110` | `192.168.10.111` |
| Liaison R1-R2 | 2 | `/30` | `255.255.255.252` | `192.168.10.112` | `192.168.10.113` | `192.168.10.114` | `192.168.10.115` |

Il reste ainsi la plage `192.168.10.116` à `192.168.10.255` (140 adresses) disponible pour des extensions futures.

---

## 4. Pièges Fréquents et Bonnes Pratiques en Examen BTS

1. **Non-respect de l'ordre décroissant** : Commencer par un petit sous-réseau entraîne des morcellements et des impossibilités d'alignement binaire pour les sous-réseaux plus larges.
2. **Oubli des 2 adresses réservées** : Toujours vérifier que $2^H - 2 \ge N$ et non $2^H \ge N$.
3. **Alignement d'adresse invalide** : L'adresse de début d'un bloc de taille $2^H$ doit toujours être un **multiple exact** de $2^H$ dans le dernier octet variable.
4. **Attribution de la passerelle** : Conventionnellement, la passerelle par défaut est configurée sur la première adresse utile (ex : `192.168.10.1`) ou sur la dernière adresse utile du sous-réseau (ex : `192.168.10.62`).
