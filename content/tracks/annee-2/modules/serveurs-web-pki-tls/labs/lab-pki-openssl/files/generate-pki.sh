#!/bin/bash
# PKI d'entreprise — Génération CA racine + certificat serveur SAN (À COMPLÉTER)
set -euo pipefail

# TODO 1 : clé privée de la CA racine, chiffrée AES-256, 4096 bits
# openssl genrsa -aes256 -out ca-racine.key 4096

# TODO 2 : certificat auto-signé de la CA racine (X.509, SHA-256, 10 ans, CA:TRUE)
# openssl req -x509 -new -sha256 -key ca-racine.key -days 3650 \
#   -out ca-racine.pem \
#   -subj "/C=FR/O=Entreprise/CN=Entreprise Root CA" \
#   -addext "basicConstraints=critical,CA:TRUE"

# TODO 3 : clé privée du serveur (2048 bits) puis CSR
# openssl genrsa -out opensio.home.lan.key 2048
# openssl req -new -key opensio.home.lan.key \
#   -out opensio.home.lan.csr \
#   -subj "/C=FR/L=Lyon/O=Entreprise/CN=opensio.home.lan"

# TODO 4 : signature du certificat serveur par la CA racine
# (SHA-256, validité 825 jours, extensions du fichier openssl-san.cnf)
# openssl x509 -req -in opensio.home.lan.csr \
#   -CA ca-racine.pem -CAkey ca-racine.key -CAcreateserial \
#   -out opensio.home.lan.crt -days 825 -sha256 -extfile openssl-san.cnf