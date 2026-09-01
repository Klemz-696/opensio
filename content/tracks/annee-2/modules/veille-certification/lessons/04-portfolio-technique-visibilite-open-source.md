---
slug: portfolio-technique-visibilite-open-source
title: "Portfolio Technique, Visibilité Professionnelle, GitHub et Preuves de Compétences"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 2
estimated_minutes: 45
objectives:
  - "Structurer un profil GitHub professionnel servant de vitrine technique pour les recruteurs"
  - "Rédiger des README de projets complets avec schémas d'architecture et guides de déploiement"
  - "Publier des articles techniques de vulgarisation et retours d'expérience (Post-Mortem, tutoriels)"
  - "Valoriser les certifications obtenues avec des badges numériques vérifiables (Credly)"
  - "Participer à l'écosystème Open Source par des contributions documentées"
prerequisites:
  - "methodologie-veille-technologique-curation"
competency_refs:
  - "B1.1"
  - "B3.4"
success_criteria:
  - "Réussir le quiz 'Portfolio Technique et Visibilité Professionnelle' avec au moins 80 %"
labs: []
references:
  - label: "GitHub Profile README Guidelines"
    url: "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme"
  - label: "Credly Digital Credentials Platform"
    url: "https://www.credly.com/"
---

# Portfolio Technique, Visibilité Professionnelle, GitHub et Preuves de Compétences

Dans le secteur de l'infrastructure et de la cybersécurité, **montrer ce que l'on sait faire vaut mille déclarations d'intention**. Un portfolio technique bien documenté transforme un CV classique en une démonstration d'expertise indiscutable.

---

## 1. L'Écosystème du Portfolio Moderne pour un Profil SISR

```mermaid
graph LR
    Candidat["Profil Candidat SISR"]
    GH["Dépôts GitHub :<br>Scripts Bash/PowerShell, Playbooks Ansible,<br>Templates Terraform, Docker Compose"]
    Blog["Blog Technique / LinkedIn :<br>Articles de retour d'expérience,<br>Résolutions de pannes complexes"]
    Badges["Badges Credly :<br>Certifications vérifiables en 1 clic (CCNA, AWS, Azure)"]
    Candidat --> GH
    Candidat --> Blog
    Candidat --> Badges
```

---

## 2. Anatomie d'un Dépôt GitHub Exemplaire

Un recruteur ou un jury d'examen (épreuve E4/E5) juge la rigueur d'un candidat à la qualité de son dépôt :

```text
mon-projet-infra/
├── .github/workflows/ci.yml     # Pipeline de test automatique
├── ansible/                     # Rôles et playbooks de configuration
├── terraform/                   # Manifestes d'infrastructure as code
├── docs/
│   └── architecture-diagram.png # Schéma réseau & flux
├── LICENSE                      # Licence open-source (ex: MIT, GPL-3.0)
└── README.md                    # Vitrine indispensable du projet
```

### Contenu indispensable du `README.md` :
1. **Titre & Contexte métier** : Problème d'entreprise que le projet résout.
2. **Schéma d'architecture visuel** : Topologie réseau, flux de données ou diagramme de conteneurs.
3. **Prérequis & Technologies utilisées** : Versions de Linux, Docker, Ansible.
4. **Guide de déploiement rapide** : Commandes à copier-coller pour tester en 5 minutes.
5. **Gestion de la sécurité & Bonnes pratiques** : Absence de secrets commités, variables d'environnement documentées.

---

## 3. Valorisation des Badges Numériques Vérifiables

- Les organismes officiels (Cisco, Microsoft, AWS, CompTIA, LPI) délivrent leurs certificats via la plateforme **Credly**.
- Chaque badge possède une URL unique contenant les métadonnées de délivrance, le score et la date d'expiration, permettant au recruteur de vérifier l'authenticité du titre sans risque de fraude.
