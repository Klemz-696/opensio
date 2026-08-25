# Script sans installation du role
Import-Module ADDSDeployment

Install-ADDSForest `
  -DomainName "entreprise.lan" `
  -DomainNetbiosName "ENTREPRISE"
