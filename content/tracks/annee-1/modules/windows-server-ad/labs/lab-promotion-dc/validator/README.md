# Validateur du Lab — Automatisation du déploiement et promotion d'un contrôleur de domaine AD DS

Ce répertoire contient le script de validation automatique du lab **Promotion d'un contrôleur de domaine** (niveau 2 — fichiers), conformément au contrat de validation OpenSIO (§26.3 et §53 Annexe D).

## Contrôles effectués

Le validateur analyse le script `promote-dc.ps1` placé dans le répertoire de travail et évalue 3 critères :

1. **`role_installed` (30 points, obligatoire)** :
   - Vérifie la commande `Install-WindowsFeature` avec le nom de rôle `AD-Domain-Services` et le paramètre `-IncludeManagementTools`.

2. **`adds_forest_configured` (45 points, obligatoire)** :
   - Vérifie l'appel de la cmdlet `Install-ADDSForest` avec le nom FQDN du domaine `entreprise.lan` et le nom NetBIOS `ENTREPRISE`.

3. **`dsrm_and_options` (25 points, obligatoire)** :
   - Vérifie la génération d'un mot de passe sécurisé DSRM (`ConvertTo-SecureString`), l'inclusion du rôle DNS (`-InstallDns:$true`), et les chemins de stockage de la base NTDS et du partage SYSVOL.

## Format de sortie

```json
{
  "passed": true,
  "score": 100,
  "checks": [
    { "id": "role_installed", "passed": true, "points": 30, "message": "Installation du rôle AD-Domain-Services validée..." },
    { "id": "adds_forest_configured", "passed": true, "points": 45, "message": "Création de la forêt entreprise.lan conforme..." },
    { "id": "dsrm_and_options", "passed": true, "points": 25, "message": "Mot de passe DSRM et options DNS/SYSVOL configurés..." }
  ]
}
```
