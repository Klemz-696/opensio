# Validateur : Analyse de Documentation Technique et Diagnostic Opérationnel en Anglais

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier d'analyse d'incident technique et de bulletin de sécurité en anglais.

## Critères d'Évaluation (100 points)
1. **`json_structure_and_service` (25 pts)** : Syntaxe JSON valide et identification du service Nginx / OpenSSL.
2. **`severity_and_cve_analysis` (25 pts)** : Sévérité critique (Critical / Emergency, CVSS 9.8) et diagnostic de la cause racine.
3. **`remediation_patch_and_hardening` (25 pts)** : Plan de remédiation prévoyant la mise à jour des paquets et la restriction TLSv1.2 / TLSv1.3.
4. **`validation_command_and_downtime` (25 pts)** : Commande de vérification (`nginx -t` / `reload`) et estimation de downtime $\le$ 5 minutes.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/diagnostic.json
```
