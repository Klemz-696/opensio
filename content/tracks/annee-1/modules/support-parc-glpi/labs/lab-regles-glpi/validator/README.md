# Validateur : Règles de Routage de Tickets et SLA dans GLPI

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de configuration du helpdesk GLPI.

## Critères d'Évaluation (100 points)
1. **`json_structure_and_rules_count` (25 pts)** : Syntaxe JSON valide et présence des 3 règles d'affectation.
2. **`vip_rule_configuration` (25 pts)** : Règle VIP (groupe Support VIP, SLA TTO $\le$ 15min, TTR $\le$ 2h).
3. **`network_rule_configuration` (25 pts)** : Règle Réseau (groupe Réseau/Sécurité, SLA TTR $\le$ 4h).
4. **`office_rule_configuration` (25 pts)** : Règle Bureautique (groupe N1, SLA TTR $\le$ 24h).

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/rules.json
```
