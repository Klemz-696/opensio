# Validateur : Construction d'un Parcours de Certifications IT et Plan d'Étude

Ce répertoire contient le script de validation autonome (`validate.mjs`) et les fixtures de test pour l'atelier de planification de certifications IT.

## Critères d'Évaluation (100 points)
1. **`career_target_and_certifications_list` (25 pts)** : Définition du profil cible et sélection d'au moins 2 certifications officielles avec codes.
2. **`budget_and_timeline_coherence` (25 pts)** : Calcul exact du budget total (total_budget_eur) et planification trimestrielle (target_quarter).
3. **`study_plan_schedule_and_intensity` (25 pts)** : Volume d'étude hebdomadaire (5-15 h) et durée de préparation (8-16 semaines).
4. **`learning_resources_and_lab_environment` (25 pts)** : Diversité des ressources d'étude (cours, labs, examens blancs) et description du Home Lab.

## Utilisation
```bash
node validator/validate.mjs /chemin/vers/repertoire
```
