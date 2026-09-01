---
slug: securite-sauvegardes-bonnes-pratiques
title: "Sécurité informatique, politiques de sauvegarde et bonnes pratiques en anglais"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 1
estimated_minutes: 40
objectives:
  - "Maîtriser le vocabulaire cyberdéfense anglophone (threats, vulnerability, exploit, breach, payload, ransomware)"
  - "Comprendre les principes de sécurité fondamentaux (Least Privilege, Separation of Duties, Zero Trust, Defense-in-Depth)"
  - "Exprimer les stratégies de sauvegarde et de reprise en anglais (Air-Gap, Immutable Storage, RTO, RPO, Off-site backup)"
  - "Lire et analyser des avis de sécurité officiels (Security Advisories, CVE, CVSS Score)"
  - "Appliquer les bonnes pratiques d'hygiène numérique et de gestion des identités"
prerequisites:
  - "vocabulaire-infrastructure-reseau"
  - "sauvegardes-stockage"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.1"
success_criteria:
  - "Réussir le quiz 'Sécurité et Bonnes Pratiques' avec au moins 80 %"
labs: []
references:
  - label: "NIST Cybersecurity Framework Glossary"
    url: "https://csrc.nist.gov/glossary"
  - label: "MITRE CVE (Common Vulnerabilities and Exposures)"
    url: "https://cve.mitre.org/"
---

# Sécurité Informatique, Politiques de Sauvegarde et Bonnes Pratiques en Anglais

La cybersécurité est une discipline mondialisée : les bulletins d'alerte du CERT, les bases de vulnérabilités **CVE** (_Common Vulnerabilities and Exposures_) et les recommandations des éditeurs sont tous publiés en anglais en premier lieu.

---

## 1. Cybersecurity Vocabulary (Lexique de la Cyberdéfense)

| English Term | French Equivalent | Technical Definition |
|---|---|---|
| **Vulnerability / Flaw** | Vulnérabilité / Faille | A weakness in software or hardware that can be exploited by an attacker. |
| **Exploit** | Programme d'exploitation | A code snippet or tool designed to take advantage of a specific vulnerability. |
| **Data Breach** | Violation de données | Unauthorized access, extraction, or disclosure of sensitive confidential information. |
| **Ransomware / Extortion** | Rançongiciel / Rançonnement | Malicious software that encrypts enterprise files and demands ransom payment for decryption. |
| **Hardening** | Durcissement système | The process of securing a system by reducing its attack surface (disabling unused ports/services). |
| **Patch Management** | Gestion des correctifs | The systematic process of acquiring, testing, and applying security updates. |
| **Tamper-proof / Immutable** | Inaltérable / Immuable | Storage mechanism preventing data from being modified or deleted even by root/admin accounts. |

```text
[ Attacker / Threat Actor ] ──► (Discovers Vulnerability: CVE-2026-1234)
                                          │
                                          ▼ (Develops Exploit Payload)
                                [ Target Server ]
                                          │
                                          ▼ (No Patch Applied)
                                [ Data Breach & Ransomware ]
```

---

## 2. Core Security Architecture Principles

- **Least Privilege (Moindre Privilège)** : Users and processes must be granted only the absolute minimum permissions necessary to perform their legitimate job functions.
- **Defense in Depth (Défense en Profondeur)** : Layering multiple defensive controls (Firewall + EDR + Segmentation + MFA) so that if one fails, others stop the intrusion.
- **Zero Trust Architecture** : *"Never trust, always verify."* Every access request must be authenticated, authorized, and encrypted regardless of whether it originates from inside or outside the corporate LAN.
- **Air-Gap (Isolation Physique)** : Complete physical disconnection between critical backup media (e.g., LTO tape drives) and the active IP network.

---

## 3. Understanding a Security Advisory & CVSS Score

When reading a security bulletin from vendor portals (Debian Security Advisory, Microsoft MSRC, Cisco Security) :

```text
Advisory ID     : DSA-5840-1 / CVE-2026-38291
Affected Package: openssh-server (Version < 9.6p1-1)
Severity        : CRITICAL (CVSS v3.1 Base Score: 9.8 / 10.0)
Vector String   : CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Summary         : A remote unauthenticated attacker can execute arbitrary code
                  with root privileges via a race condition in signal handler.
Remediation     : Upgrade packages immediately using:
                  $ sudo apt-get update && sudo apt-get install --only-upgrade openssh-server
```

---

## 4. Useful Security Phrases in English

- *"We detected an unauthorized brute-force attack originating from an external IP address."*  
  (Nous avons détecté une attaque par force brute non autorisée provenant d'une adresse IP externe.)
- *"Multi-Factor Authentication (MFA) is strictly enforced for all remote access and VPN connections."*  
  (L'authentification multifacteur est strictement obligatoire pour tous les accès distants et connexions VPN.)
- *"The backup repository is configured with object locking to guarantee ransomware resilience."*  
  (Le dépôt de sauvegarde est configuré avec verrouillage d'objets pour garantir la résilience contre les rançongiciels.)
