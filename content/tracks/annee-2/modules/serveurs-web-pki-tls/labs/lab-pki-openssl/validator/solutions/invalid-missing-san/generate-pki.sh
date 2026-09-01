#!/bin/bash
# PKI d'entreprise — script complet (fixture du cas invalid-missing-san)
set -euo pipefail

openssl genrsa -aes256 -out ca-racine.key 4096
openssl req -x509 -new -sha256 -key ca-racine.key -days 3650 \
  -out ca-racine.pem \
  -subj "/C=FR/O=Entreprise/CN=Entreprise Root CA" \
  -addext "basicConstraints=critical,CA:TRUE"

openssl genrsa -out opensio.home.lan.key 2048
openssl req -new -key opensio.home.lan.key \
  -out opensio.home.lan.csr \
  -subj "/C=FR/L=Lyon/O=Entreprise/CN=opensio.home.lan"

openssl x509 -req -in opensio.home.lan.csr \
  -CA ca-racine.pem -CAkey ca-racine.key -CAcreateserial \
  -out opensio.home.lan.crt -days 825 -sha256 -extfile openssl-san.cnf