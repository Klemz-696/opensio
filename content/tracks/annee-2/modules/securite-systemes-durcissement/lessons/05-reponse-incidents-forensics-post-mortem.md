---
slug: reponse-incidents-forensics-post-mortem
title: "Réponse aux Incidents Cyber, Forensics de Base, Confinement et Retour d'Expérience (Post-Mortem)"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 50
objectives:
  - "Maîtriser les 6 étapes du cycle de réponse à incident (NIST SP 800-61 / ISO 27035)"
  - "Isoler et confiner une machine compromise sans détruire les preuves volatiles en mémoire vive"
  - "Identifier et classifier les indicateurs de compromission (IoC) : hashs de fichiers, IPs, domaines C2"
  - "Appliquer les principes d'investigation numérique légale (Forensics) et l'ordre de volatilité (RFC 3227)"
  - "Rédiger un rapport de retour d'expérience (Post-Mortem / Lessons Learned) pour renforcer l'infrastructure"
prerequisites:
  - "linux-administration"
  - "principes-durcissement-guides-anssi-cis"
competency_refs:
  - "B2.2"
  - "B3.1"
success_criteria:
  - "Réussir le quiz 'Réponse aux Incidents et Forensics' avec au moins 80 %"
labs: []
references:
  - label: "NIST Computer Security Incident Handling Guide (SP 800-61 Rev. 2)"
    url: "https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final"
  - label: "RFC 3227 - Guidelines for Evidence Collection and Archiving"
    url: "https://datatracker.ietf.org/doc/html/rfc3227"
---

# Réponse aux Incidents Cyber, Forensics de Base, Confinement et Retour d'Expérience (Post-Mortem)

Lorsqu'une intrusion est suspectée ou confirmée, la rapidité et la méthode de l'équipe de réponse aux incidents déterminent si l'attaque sera circonscrite en quelques minutes ou se transformera en catastrophe majeure pour l'organisation.

---

## 1. Le Cycle de Gestion des Incidents (NIST SP 800-61)

```mermaid
graph TD
    PREP["1. Préparation : Playbooks, outils, accès et astreintes"] --> DETECT["2. Détection & Analyse : Corrélation SIEM/EDR, triage"]
    DETECT --> CONT["3. Confinement : Quarantaine réseau (Ne PAS éteindre la VM)"]
    CONT --> ERAD["4. Éradication : Suppression malwares, révocation accès"]
    ERAD --> REC["5. Récupération : Restauration saine, reprise surveillée"]
    REC --> RETEX["6. Retour d'Expérience (Post-Mortem) : Rapport & plan d'action"]
```

---

## 2. Confinement et Respect de l'Ordre de Volatilité (RFC 3227)

L'erreur la plus fréquente lors de la détection d'un ransomware ou d'un pirate consiste à débrancher la prise électrique ou éteindre la machine. **Éteindre la machine détruit immédiatement toutes les preuves critiques résidant en mémoire vive (RAM)** (clés de chiffrement, processus malveillants injectés, connexions réseau actives).

```text
┌─────────────────────────────────────────────────────────────┐
│          ORDRE DE VOLATILITÉ DES PREUVES (RFC 3227)         │
├─────────────────────────────────────────────────────────────┤
│ 1. Plus volatile  : Registres CPU, mémoire cache            │
│ 2. Très volatile  : Mémoire vive (RAM)                      │
│ 3. Volatile       : Tables de routage, connexions réseau    │
│ 4. Persistant     : Disques durs virtuels, systèmes de fich.│
│ 5. Très stable    : Journaux distants (Syslog centralisé)   │
└─────────────────────────────────────────────────────────────┘
```

### Bonne pratique d'isolation :
- Couper l'interface réseau virtuelle (déconnexion du vSwitch / quarantaine VLAN) ou bloquer le trafic via le pare-feu local sans éteindre le système d'exploitation.
- Réaliser un instantané mémoire (*Memory Dump* ou Snapshot VM avec état RAM) avant toute manipulation.

---

## 3. Le Rapport de Post-Mortem (Lessons Learned)

Après la remédiation de l'incident, l'équipe produit un document formel structuré :
1. **Résumé exécutif** : Impact métier, durée d'indisponibilité, données touchées.
2. **Chronologie détaillée des événements** : Heure exacte de l'intrusion initiale, étapes de propagation, heure de détection et heure de reprise.
3. **Vecteur initial de compromission** : Faille logicielle non patchée, hameçonnage (*phishing*), mot de passe faible, compte de service compromis.
4. **Plan d'actions correctives** : Durcissement des GPO, mise en œuvre du MFA obligatoire, déploiement d'un agent EDR sur les serveurs orphelins.
