# Validateur : Rédaction Professionnelle d'un Ticket de Support en Anglais

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de rédaction de ticket d'incident en anglais.

## Critères d'Évaluation (100 points)
1. **`ticket_structure_and_priority` (25 pts)** : En-têtes Markdown complets et priorité P1 - Critical.
2. **`symptoms_and_impact_english` (25 pts)** : Description précise des symptômes et de l'impact en anglais (db-prod-01, ERP, 150 users).
3. **`troubleshooting_and_workaround` (25 pts)** : Diagnostic technique (100% full) et contournement temporaire (2 GB freed).
4. **`action_requested_clarity` (25 pts)** : Demande d'extension de stockage claire et actionnable pour l'équipe N2 (expand by 50 GB).

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire/contenant/ticket.md
```
