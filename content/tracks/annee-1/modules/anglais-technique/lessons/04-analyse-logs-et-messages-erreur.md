---
slug: analyse-logs-et-messages-erreur
title: "Analyse de logs, interprétation des messages d'erreur et procédures d'exploitation"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 1
estimated_minutes: 40
objectives:
  - "Comprendre et interpréter rapidement les messages d'erreur standard UNIX/Linux et Windows"
  - "Analyser la syntaxe des journaux système en anglais (syslog, systemd journalctl, Windows Event Logs, Apache/Nginx error logs)"
  - "Distinguer les niveaux de sévérité de logs : Emergency, Alert, Critical, Error, Warning, Notice, Info, Debug"
  - "Associer les codes d'état réseau et web standard (403 Forbidden, 404 Not Found, 500 Internal Error, 502 Bad Gateway)"
  - "Rédiger des procédures d'exploitation standardisées (Standard Operating Procedures - SOP)"
prerequisites:
  - "vocabulaire-infrastructure-reseau"
  - "linux-administration"
competency_refs:
  - "B1.1"
  - "B1.2"
  - "B2.1"
success_criteria:
  - "Réussir le quiz 'Analyse de Logs et Messages d'Erreur' avec au moins 80 %"
  - "Valider l'atelier 'Analyse de Journal Technique et Diagnostic Opérationnel en Anglais'"
labs:
  - slug: analyse-documentation-technique-anglais
    required: true
references:
  - label: "RFC 5424 — The Syslog Protocol (Severity Levels)"
    url: "https://datatracker.ietf.org/doc/html/rfc5424"
  - label: "systemd journalctl Documentation"
    url: "https://man7.org/linux/man-pages/man1/journalctl.1.html"
---

# Analyse de Logs, Messages d'Erreur et Procédures d'Exploitation

Face à un serveur défaillant ou un service inaccessible, les journaux d'événements (_Log files_) rédigés en anglais sont la première source d'information de l'administrateur système.

---

## 1. Niveaux de Sévérité Syslog (RFC 5424)

Les systèmes UNIX/Linux et les équipements réseau classent leurs messages selon 8 niveaux standardisés :

| Numerical Code | Severity Level | Description & Meaning | Example in Production |
|:---:|---|---|---|
| **0** | **Emergency (`emerg`)** | System is completely unusable / Kernel panic. | *"Kernel panic - not syncing: Fatal exception in interrupt"* |
| **1** | **Alert (`alert`)** | Immediate action required. | *"RAID controller battery failed, cache disabled"* |
| **2** | **Critical (`crit`)** | Critical hardware or software component failure. | *"Hard disk /dev/sdb reported uncorrectable I/O error"* |
| **3** | **Error (`err`)** | Error condition preventing a task from succeeding. | *"Failed to bind to port 443: Address already in use"* |
| **4** | **Warning (`warning`)** | Warning condition, not an error yet but risky. | *"Disk /var/log partition usage exceeds 92%"* |
| **5** | **Notice (`notice`)** | Normal but significant operational condition. | *"User admin logged in from IP 192.168.10.45"* |
| **6** | **Informational (`info`)** | Standard operational trace. | *"Service nginx.service started successfully"* |
| **7** | **Debug (`debug`)** | Verbose messages for developers / troubleshooting. | *"Received TCP ACK packet seq=1024 ack=512"* |

---

## 2. Common System Error Messages & Diagnostic

| Log Message in English | Meaning & Root Cause | Recommended Troubleshooting Action |
|---|---|---|
| **`Permission denied`** | L'utilisateur n'a pas les droits en lecture/écriture/exécution sur le fichier ou dossier. | Vérifier les permissions POSIX (`ls -la`), le propriétaire (`chown`) ou les contextes SELinux/AppArmor. |
| **`Connection refused`** | Le serveur cible a rejeté le paquet TCP (le service est arrêté ou n'écoute pas sur ce port). | Vérifier le statut du service (`systemctl status`) et les ports en écoute (`ss -tulpn`). |
| **`Connection timed out`** | Le paquet n'a reçu aucune réponse (problème de routage ou filtrage par pare-feu silencieux). | Vérifier la connectivité (`ping`, `traceroute`) et les règles de pare-feu (`iptables`, `nftables`, UFW). |
| **`No route to host`** | Le routeur local ne sait pas comment acheminer le trafic vers l'IP de destination. | Vérifier la table de routage (`ip route`) et la passerelle par défaut. |
| **`No space left on device`** | La partition disque est pleine ou la table des inodes est saturée. | Vérifier l'espace disque (`df -h`) et les inodes (`df -i`), supprimer les fichiers temporaires. |
| **`Segmentation fault (core dumped)`** | Le programme a tenté d'accéder à une zone de mémoire vive non allouée (crash binaire). | Mettre à jour le logiciel ou analyser le fichier core dump avec `gdb`. |

---

## 3. Web & Application Status Codes

```text
[ 1xx Informational ] -> Protocol handshake in progress.
[ 2xx Success ]       -> 200 OK, 201 Created, 204 No Content.
[ 3xx Redirection ]   -> 301 Moved Permanently (HTTP->HTTPS), 302 Found.
[ 4xx Client Errors ] -> 400 Bad Request, 401 Unauthorized (Auth missing),
                         403 Forbidden (ACL denied), 404 Not Found, 429 Too Many Requests.
[ 5xx Server Errors ] -> 500 Internal Server Error, 502 Bad Gateway (Backend down),
                         503 Service Unavailable (Overloaded), 504 Gateway Timeout.
```

---

## 4. Standard Operating Procedures (SOP)

Une **SOP** est une procédure d'exploitation standardisée étape par étape rédigée à l'impératif pour éviter toute erreur humaine :

```text
### SOP: Emergency Apache Web Server Restart
1. Log in to the host via SSH using your dedicated admin account:
   $ ssh admin@srv-web-01.corp.lan
2. Validate the configuration syntax before restarting:
   $ sudo apachectl configtest
   -> Expected output: "Syntax OK"
3. If syntax is valid, gracefully reload the daemon:
   $ sudo systemctl reload apache2
4. Verify service health and active listening ports:
   $ sudo systemctl status apache2
   $ ss -tlpn | grep :443
```
