# Synthèse de Veille Technologique : Dépréciation de TLS 1.0/1.1 et Migration vers TLS 1.3

## 1. Métadonnées
- **Date de publication** : 2026-08-27
- **Source officielle** : CERT-FR (Bulletin d'alerte CERTFR-2026-ALE-004 - https://www.cert.ssi.gouv.fr/)
- **Auteur / Organisme** : Agence Nationale de la Sécurité des Systèmes d'Information (ANSSI)

## 2. Résumé Technique
L'ANSSI et les principaux éditeurs rappellent la fin définitive du support des protocoles cryptographiques TLS 1.0 et TLS 1.1. Ces versions obsolètes utilisent des algorithmes de hachage et de chiffrement vulnérables aux attaques par rétrogradation (Downgrade Attacks) et à l'injection de texte chiffré (failles BEAST, POODLE). Le standard recommandé est désormais exclusivement TLS 1.3, avec repli toléré sur TLS 1.2 durci.

## 3. Analyse d'Impact pour le Système d'Information
Au sein de notre infrastructure d'entreprise, les passerelles de Reverse Proxy Nginx et les clusters Kubernetes hébergeant nos applications critiques doivent impérativement être audités. La persistance de chiffrements obsolètes expose le SI à des risques d'interception d'échanges confidentiels (mots de passe, données bancaires) et invalide notre conformité aux référentiels PCI-DSS et ISO 27001.

## 4. Préconisations Opérationnelles
1. **Audit automatisé** : Déployer un script d'analyse SSL/TLS (testssl.sh) sur l'ensemble de nos noms de domaine publics.
2. **Déploiement IaC** : Mettre à jour nos playbooks Ansible de durcissement Nginx pour restreindre `ssl_protocols TLSv1.2 TLSv1.3;` et configurer une liste stricte de suites cryptographiques (ECDHE-ECDSA-AES256-GCM-SHA384).
3. **Notification partenaires** : Informer nos clients et partenaires utilisant d'anciens connecteurs applicatifs de l'obligation de migrer vers des bibliothèques clientes modernes sous 30 jours.
