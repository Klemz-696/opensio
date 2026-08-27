---
slug: architecture-glpi-et-deploiement
title: "Architecture de GLPI, prérequis et organisation en entités"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 1
estimated_minutes: 45
objectives:
  - "Comprendre l'architecture logicielle de GLPI (pile LAMP : Linux, Apache, MariaDB/MySQL, PHP)"
  - "Identifier les prérequis techniques, extensions PHP indispensables et sécurisation de l'accès Web"
  - "Concevoir une arborescence d'entités hiérarchique adaptée aux organisations multi-sites et multi-sociétés"
  - "Comprendre la récursivité des objets, règles et habilitations au sein de l'arborescence d'entités"
  - "Découvrir les profils par défaut (Self-Service, Technicien, Super-Admin) et l'interface utilisateur"
prerequisites:
  - "principes-itil-et-support"
  - "linux-administration"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B1.5"
success_criteria:
  - "Réussir le quiz 'Architecture GLPI et Déploiement' avec au moins 80 %"
labs: []
references:
  - label: "GLPI Project Official Documentation"
    url: "https://glpi-project.org/documentation/"
  - label: "GLPI Installation Guide on Debian/Ubuntu"
    url: "https://glpi-install.readthedocs.io/fr/latest/install/index.html"
---

# Architecture de GLPI, Prérequis et Organisation en Entités

**GLPI** (_Gestionnaire Libre de Parc Informatique_) est une solution open-source leader en Europe pour la gestion des services informatiques (ITSM) et la gestion des actifs informatiques (ITAM).

---

## 1. Architecture Technique : La Pile LAMP

GLPI repose sur une architecture Web 3-tiers standard et éprouvée :

```text
[ Navigateurs Web Utilisateurs / Techniciens ]      [ GLPI Agents (Postes & Serveurs) ]
                     │                                              │ (HTTP / HTTPS POST JSON)
                     ▼                                              ▼
+---------------------------------------------------------------------------------------+
|                                 SERVEUR GLPI (Debian 12)                              |
|                                                                                       |
|  [ Serveur Web : Apache 2.4 / Nginx ]                                                 |
|    - VirtualHost sécurisé HTTPS (Port 443 TLS)                                        |
|    - Racine Web stricte : /var/www/glpi/public (Isolation des sources sensibles)      |
|                                                                                       |
|  [ Moteur Applicatif : PHP 8.2 / 8.3-FPM ]                                            |
|    - Extensions indispensables : php-mysqli, php-ldap, php-curl, php-gd,              |
|      php-intl, php-mbstring, php-xml, php-zip, php-bz2                                |
|                                                                                       |
|  [ Tâches planifiées : Cron Système ]                                                 |
|    - /etc/cron.d/glpi -> /usr/bin/php /var/www/glpi/front/cron.php                     |
+-------------------------------------------┬-------------------------------------------+
                                            │ (Port 3306 TCP)
                                            ▼
+---------------------------------------------------------------------------------------+
|                           BASE DE DONNÉES : MariaDB 10.11 / MySQL 8.0                 |
|  - Tables relationnelles (glpi_tickets, glpi_computers, glpi_users, glpi_entities)    |
|  - Encodage strict : utf8mb4_unicode_ci                                               |
+---------------------------------------------------------------------------------------+
```

---

## 2. Le Concept Central des Entités dans GLPI

Une **Entité** dans GLPI représente un périmètre organisationnel, géographique ou juridique étanche. Tout objet (ticket, ordinateur, imprimante, utilisateur, contrat, règle) appartient obligatoirement à une entité.

```text
                                [ Entité Racine (Holding / Siège) ]
                                                │
                ┌───────────────────────────────┴───────────────────────────────┐
                ▼                                                               ▼
   [ Filiale France (Paris) ]                                     [ Filiale International (Londres) ]
                │
        ┌───────┴───────┐
        ▼               ▼
 [ Site Lyon ]   [ Site Marseille ]
```

### 2.1. Règles d'Héritage et Récursivité
- **Récursivité (Oui/Non)** : Lorsqu'un technicien ou un gabarit est déclaré avec l'option `Récursif = Oui` dans *Filiale France*, il a automatiquement accès à tous les sous-sites (*Lyon*, *Marseille*).
- **Isolation étanche** : Un utilisateur rattaché uniquement à l'entité *Site Lyon* ne verra **jamais** les tickets ni le matériel du *Site Marseille* ou de l'entité *Londres*.

---

## 3. Profils d'Habilitation et Droits Utilisateurs

GLPI intègre nativement une matrice de droits RBAC (_Role-Based Access Control_) :

| Profil par Défaut | Interface | Droits et Rôles Typiques |
|---|---|---|
| **Self-Service (Post-only)** | Interface simplifiée épurée | Créer un ticket, suivre l'avancement de ses propres demandes, consulter la FAQ / Base de connaissances, réserver un matériel partagé. |
| **Technician (Technicien)** | Interface d'administration complète | Prendre en charge des tickets, rédiger des tâches et solutions, consulter l'inventaire matériel et logiciel de son entité. |
| **Admin (Administrateur)** | Interface d'administration | Gérer les utilisateurs, les groupes, les contrats, les licences, configurer les gabarits et les règles d'affectation. |
| **Super-Admin** | Interface d'administration | Accès total non restreint à toutes les entités, configuration du serveur GLPI, plugins, passerelle de messagerie et connecteurs LDAP/SSO. |
