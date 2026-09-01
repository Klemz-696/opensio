# Rapport d'incident

## Summary
Le serveur de base de données PostgreSQL est en panne sur db-prod-01

## Priority
P1 - Critical

## Affected System
db-prod-01.corp.lan

## Symptoms & Impact
Le serveur est en panne et l'ERP ne marche plus du tout pour 150 utilisateurs.

## Troubleshooting & Workaround
Le disque est plein à 100%. Nous avons supprimé 2 Go de logs.

## Action Requested
Veuillez augmenter la partition de 50 Go s'il vous plaît.
