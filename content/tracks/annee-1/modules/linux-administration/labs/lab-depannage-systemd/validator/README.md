# Validateur — Rédaction et durcissement d'une unité systemd

## Contrôles effectués

1. **`unit_dependencies_valid` (30 points, requis)** :
   - `Description` présente et claire.
   - `After=network.target postgresql.service`
   - `Requires=postgresql.service`

2. **`service_execution_valid` (40 points, requis)** :
   - `User=appuser` et `Group=appuser`
   - `WorkingDirectory=/opt/api-backend`
   - `ExecStart=/usr/bin/node /opt/api-backend/dist/main.js`
   - `Restart=always`
   - `EnvironmentFile=/opt/api-backend/.env`

3. **`hardening_and_install_valid` (30 points, requis)** :
   - `NoNewPrivileges=true`
   - `ProtectSystem=full`
   - `PrivateTmp=true`
   - `WantedBy=multi-user.target`

Score maximal : **100 points**. Seuil : **80 %** et tous les contrôles obligatoires validés.
