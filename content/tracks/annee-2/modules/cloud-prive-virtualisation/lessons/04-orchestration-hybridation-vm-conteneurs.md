---
slug: orchestration-hybridation-vm-conteneurs
title: "Orchestration, Hybridation VMs/Conteneurs et Automatisation avec Cloud-Init"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 50
objectives:
  - "Comparer les cas d'usage des Machines Virtuelles (KVM) et des Conteneurs (LXC/Docker)"
  - "Comprendre l'architecture d'un cluster Kubernetes déployé au sein d'un Cloud Privé (Virtualisation imbriquée)"
  - "Optimiser le provisionnement rapide avec les Templates et les Clones Liés (Linked Clones)"
  - "Automatiser la configuration initiale d'une VM au boot grâce à Cloud-Init (user-data)"
  - "Piloter le cycle de vie de l'infrastructure privée via Terraform et Ansible"
prerequisites:
  - "conteneurisation-docker"
  - "virtualisation-avancee-kvm-libvirt-clusters"
competency_refs:
  - "B2.1"
  - "B2.3"
success_criteria:
  - "Réussir le quiz 'Orchestration et Hybridation VMs/Conteneurs' avec au moins 80 %"
labs: []
references:
  - label: "Cloud-Init Official Documentation"
    url: "https://cloudinit.readthedocs.io/"
  - label: "Kubernetes on Private Cloud (K3s Architecture)"
    url: "https://k3s.io/"
---

# Orchestration, Hybridation VMs/Conteneurs et Automatisation avec Cloud-Init

Les infrastructures modernes ne choisissent plus entre machines virtuelles et conteneurs : elles les **associent en symbiose**. Les hyperviseurs fournissent l'isolation multi-tenant et la résilience matérielle, tandis que les conteneurs apportent l'agilité et la densité applicative.

---

## 1. VMs vs Conteneurs et Virtualisation Imbriquée

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. MACHINES VIRTUELLES (KVM / QEMU)                         │
│    - Isolation forte au niveau matériel (Noyaux distincts)   │
│    - Idéal pour : Systèmes hétérogènes (Windows/Linux),      │
│      conformité de sécurité stricte, charges monolithiques. │
├─────────────────────────────────────────────────────────────┤
│ 2. CONTENEURS APPLICATIFS (Docker / Kubernetes)              │
│    - Isolation légère au niveau processus (Noyau partagé)   │
│    - Idéal pour : Microservices, CI/CD, montée en charge    │
│      rapide (scaling horizontal en quelques secondes).      │
└─────────────────────────────────────────────────────────────┘
```

### Le modèle hybride : Kubernetes sur Cloud Privé
Les nœuds maîtres (*Control Plane*) et les nœuds de calcul (*Workers*) de Kubernetes sont provisionnés sous forme de machines virtuelles KVM au sein du Cloud Privé, garantissant une séparation étanche des environnements de staging et de production.

---

## 2. Provisionnement Instantané : Templates et Clones Liés

Créer une machine virtuelle à partir d'un fichier ISO d'installation prend 15 à 30 minutes. Le Cloud Privé utilise des **Templates** et des **Clones Liés (_Linked Clones_)** :

```mermaid
graph TD
    TPL["Template VM Immuable (Disque Base Ubuntu .qcow2 : 2.5 Go)"]
    TPL -.->|Clonage Copy-on-Write (Quelques secondes)| VM1["VM Web-01 (Disque Différentiel : 120 Mo)"]
    TPL -.->|Clonage Copy-on-Write (Quelques secondes)| VM2["VM Web-02 (Disque Différentiel : 110 Mo)"]
    TPL -.->|Clonage Copy-on-Write (Quelques secondes)| VM3["VM API-01 (Disque Différentiel : 240 Mo)"]
```

---

## 3. Automatisation au Premier Démarrage avec Cloud-Init

**Cloud-Init** est l'outil universel qui configure automatiquement le système invité dès sa première seconde d'exécution à partir d'un fichier `user-data` :

```yaml
#cloud-config
# user-data - Configuration automatisée de l'instance
hostname: srv-web-prod
fqdn: srv-web-prod.opensio.local
manage_etc_hosts: true

users:
  - name: devops
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGu8VdK9p4w0bJ7QyP1xO8mN2eL4vT3w1yZ5x7r8q9s0 devops@opensio.local

packages:
  - qemu-guest-agent
  - nginx
  - curl

runcmd:
  - systemctl enable --now qemu-guest-agent
  - systemctl enable --now nginx
  - echo "<h1>Instance déployée via Cloud-Init sur Cloud Privé</h1>" > /var/www/html/index.html
```
