# Script avec parametres errones
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# Mot de passe DSRM manquant et mauvais nom de domaine
Install-ADDSForest `
  -DomainName "autre-domaine.fr" `
  -DomainNetbiosName "AUTRE"
