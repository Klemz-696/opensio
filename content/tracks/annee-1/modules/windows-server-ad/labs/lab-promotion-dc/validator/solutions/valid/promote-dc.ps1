# Script PowerShell - Deploiement AD DS et Promotion de Foret
# -----------------------------------------------------------

# 1. Installation des fonctionnalites et du role AD DS
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# 2. Preparation du mot de passe DSRM
# ATTENTION - LAB UNIQUEMENT : le mot de passe est volontairement en clair
# ici a des fins pedagogiques. En production, JAMAIS de secret en clair
# dans un script : utiliser Read-Host -AsSecureString, une variable
# d'environnement, ou un coffre-fort de secrets (Azure Key Vault, Vault).
$dsrmPassword = ConvertTo-SecureString "P@ssw0rdDSRM!2026" -AsPlainText -Force

# 3. Promotion du controleur de domaine (Install-ADDSForest)
Import-Module ADDSDeployment

Install-ADDSForest `
  -DomainName "entreprise.lan" `
  -DomainNetbiosName "ENTREPRISE" `
  -DomainMode "WinThreshold" `
  -ForestMode "WinThreshold" `
  -DatabasePath "C:\Windows\NTDS" `
  -LogPath "C:\Windows\NTDS" `
  -SysvolPath "C:\Windows\SYSVOL" `
  -InstallDns:$true `
  -SafeModeAdministratorPassword $dsrmPassword `
  -CreateDnsDelegation:$false `
  -NoRebootOnCompletion:$false `
  -Force:$true
