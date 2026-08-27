---
slug: gestion-centralisation-logs-loki
title: "Centralisation des Journaux d'Événements, Stack Grafana Loki et Langage LogQL"
version: 1.0.0
last_reviewed: "2026-08-27"
difficulty: 3
estimated_minutes: 55
objectives:
  - "Comprendre les enjeux techniques et réglementaires de la centralisation des logs"
  - "Comparer les approches d'indexation lourde (Elasticsearch) et d'indexation par labels (Loki)"
  - "Configurer l'agent de collecte Promtail (scraping, pipeline stages, parsing JSON/Regex)"
  - "Interroger et analyser les journaux d'événements avec le langage de requête LogQL"
  - "Générer des métriques en temps réel à partir de flux de logs bruts"
prerequisites:
  - "linux-administration"
  - "conteneurisation-docker"
competency_refs:
  - "B2.1"
  - "B3.1"
success_criteria:
  - "Réussir le quiz 'Centralisation des Logs et Loki' avec au moins 80 %"
labs:
  - slug: centralisation-logs-promtail-loki
    required: true
references:
  - label: "Grafana Loki Documentation"
    url: "https://grafana.com/docs/loki/latest/"
  - label: "LogQL Query Language Reference"
    url: "https://grafana.com/docs/loki/latest/query/"
---

# Centralisation des Journaux d'Événements, Stack Grafana Loki et Langage LogQL

Face à des architectures modernes comptant des dizaines de conteneurs et de machines virtuelles, se connecter manuellement en SSH sur chaque serveur pour lire des fichiers `/var/log/` devient impossible. La **centralisation des logs** agrège l'ensemble des événements du système d'information dans un point d'accès unifié.

---

## 1. Comparatif Architectural : Elasticsearch (ELK) vs Grafana Loki

```text
┌──────────────────────────────────────────────────────────────┐
│ 1. STACK ELK (Elasticsearch / Logstash / Kibana)             │
│    - Approche : Indexation plein texte (Full-Text Inverted). │
│    - Conséquence : Index parfois plus volumineux que les     │
│      logs eux-mêmes. Forte empreinte RAM et coût élevé.      │
├──────────────────────────────────────────────────────────────┤
│ 2. STACK GRAFANA LOKI ("Like Prometheus, but for Logs")      │
│    - Approche : Indexe UNIQUEMENT les labels de métadonnées. │
│    - Corps du log : Compressé et stocké sur disque ou S3.    │
│    - Conséquence : Consommation mémoire et disque divisée    │
│      par 5 à 10, alignement parfait avec l'écosystème Grafana.│
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture de Collecte avec Promtail et Loki

```mermaid
graph LR
    subgraph Nodes ["Nœuds Serveurs & Conteneurs"]
        F1["/var/log/nginx/access.log"]
        F2["/var/log/syslog"]
        PT[Agent Promtail : Collecte & Parsing]
    end
    subgraph Storage ["Cœur Loki"]
        L[Serveur Loki : Stockage d'Index & Chunks Compressés]
    end
    subgraph Analysis ["Visualisation"]
        G[Grafana Explore : Requêtes LogQL]
    end
    F1 --> PT
    F2 --> PT
    PT -->|Flux HTTP POST JSON/Protobuf| L
    G -->|Requêtes LogQL| L
```

### Exemple de configuration Promtail (`promtail-config.yml`) :
```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: nginx-access
    static_configs:
      - targets: [localhost]
        labels:
          job: nginx
          env: production
          __path__: /var/log/nginx/*access.log
    pipeline_stages:
      - json:
          expressions:
            status: status
            client_ip: remote_addr
            request_time: request_time
      - labels:
          status:
```

---

## 3. Le Langage de Requête LogQL

LogQL s'inspire directement de PromQL et se divise en deux catégories d'analyses :

### A. Requêtes de filtrage de flux de logs :
```logql
# 1. Sélectionner les logs Nginx de production contenant '404' ou '500'
{job="nginx", env="production"} |= "status=" |~ "50[0-9]"

# 2. Parsing JSON à la volée et filtrage logique sur champs structurés
{job="nginx"} | json | status >= 500 and request_time > 1.5
```

### B. Requêtes métriques dérivées des logs :
LogQL permet de transformer des flux de logs bruts en séries temporelles numériques exploitables dans Grafana :
```logql
# Calcul du débit d'erreurs 5xx par seconde par hôte depuis les logs
sum by (host) (rate({job="nginx"} |= "500"[5m]))
```
