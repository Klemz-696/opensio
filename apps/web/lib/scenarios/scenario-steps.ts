/**
 * Définition des étapes QCM pour chaque scénario de panne (labs 1_theory).
 * Les ID de step et les réponses correctes correspondent aux validateurs back-end.
 * Ce fichier est purement déclaratif — aucune logique métier.
 */

import type { ScenarioStep } from '../../components/labs/scenario-player';

/** Scénario S1 — DHCP indisponible */
const SCENARIO_DHCP_STEPS: ScenarioStep[] = [
  {
    id: 'diagnostic_cause',
    question:
      'Les postes affichent une adresse 169.254.x.x. Que signifie cette adresse ?',
    choices: [
      { id: 'a', text: "Conflit d'adresses IP entre deux postes sur le même réseau" },
      { id: 'b', text: "Le poste n'a reçu aucune réponse DHCP et s'est auto-configuré (APIPA)" },
      { id: 'c', text: 'Le serveur DHCP a attribué une adresse invalide' },
      { id: 'd', text: "Le masque de sous-réseau est incorrect sur l'interface" },
    ],
  },
  {
    id: 'diagnostic_service',
    question:
      "En lisant les logs du serveur DHCP, quelle est la cause de l'échec du service ?",
    choices: [
      { id: 'a', text: "Le service isc-dhcp-server n'est pas installé sur le serveur" },
      { id: 'b', text: 'Le fichier /etc/dhcp/dhcpd.conf est absent du système' },
      {
        id: 'c',
        text: "L'option 'routers' (192.168.99.1) n'appartient pas au sous-réseau 192.168.10.0/24 déclaré",
      },
      { id: 'd', text: "Le port UDP 67 est bloqué par le pare-feu du serveur" },
    ],
  },
  {
    id: 'remediation',
    question: 'Quelle est la correction à apporter dans dhcpd.conf pour résoudre ce problème ?',
    choices: [
      {
        id: 'a',
        text: "Remplacer 'option routers 192.168.99.1' par une adresse appartenant au réseau 192.168.10.0/24 (ex. 192.168.10.254)",
      },
      { id: 'b', text: "Changer le sous-réseau de 192.168.10.0/24 vers 192.168.99.0/24" },
      { id: 'c', text: 'Supprimer la directive option routers du fichier de configuration' },
      { id: 'd', text: 'Réinstaller le paquet isc-dhcp-server et relancer le service' },
    ],
  },
];

/** Scénario S2 — DNS incorrect */
const SCENARIO_DNS_STEPS: ScenarioStep[] = [
  {
    id: 'diagnostic_nxdomain',
    question:
      'La commande dig retourne "NXDOMAIN" pour mail.entreprise.lan. Que signifie ce statut ?',
    choices: [
      {
        id: 'a',
        text: "Le serveur DNS 10.0.0.53 est inaccessible sur le réseau",
      },
      {
        id: 'b',
        text: "Le serveur DNS fait autorité sur la zone mais ne possède pas l'enregistrement demandé",
      },
      {
        id: 'c',
        text: "L'enregistrement existe mais la TTL a expiré dans le cache",
      },
      {
        id: 'd',
        text: "Le nom mail.entreprise.lan est refusé par le pare-feu",
      },
    ],
  },
  {
    id: 'diagnostic_zone',
    question:
      "Dans db.entreprise.lan, quelle est la cause de l'absence de résolution pour 'mail' ?",
    choices: [
      {
        id: 'a',
        text: "La ligne 'mail IN A 10.0.1.25' est commentée (précédée de ';') et ignorée par Bind9",
      },
      {
        id: 'b',
        text: "L'enregistrement A pour 'mail' n'a jamais été créé dans le fichier de zone",
      },
      {
        id: 'c',
        text: "Le numéro de série (Serial) de la SOA n'a pas été incrémenté",
      },
      {
        id: 'd',
        text: "Le fichier de zone n'est pas référencé dans named.conf",
      },
    ],
  },
  {
    id: 'remediation_zone',
    question:
      "Quelle est la correction à apporter pour que 'mail.entreprise.lan' se résolve correctement ?",
    choices: [
      {
        id: 'a',
        text: "Supprimer le fichier de zone et le recréer depuis zéro avec l'enregistrement mail",
      },
      {
        id: 'b',
        text: 'Redémarrer complètement le serveur pour vider le cache DNS',
      },
      {
        id: 'c',
        text: "Décommenter la ligne 'mail IN A 10.0.1.25', incrémenter le Serial de la SOA, puis recharger avec 'rndc reload entreprise.lan'",
      },
      {
        id: 'd',
        text: "Ajouter un enregistrement CNAME pointant mail vers www.entreprise.lan",
      },
    ],
  },
  {
    id: 'remediation_forwarder',
    question:
      'Le forwarder 192.168.0.254 ne répond plus. Quelle action corrective appliquer ?',
    choices: [
      {
        id: 'a',
        text: "Désactiver les forwarders dans named.conf pour que Bind9 résolve directement",
      },
      {
        id: 'b',
        text: "Remplacer 192.168.0.254 par un résolveur fiable (1.1.1.1 ou 8.8.8.8) dans named.conf.options",
      },
      {
        id: 'c',
        text: "Supprimer la clause 'forwarders' sans la remplacer",
      },
      {
        id: 'd',
        text: "Redémarrer le serveur 192.168.0.254 pour le relancer",
      },
    ],
  },
];

/** Scénario S6 — Service web arrêté */
const SCENARIO_SERVICE_WEB_STEPS: ScenarioStep[] = [
  {
    id: 'diagnostic_502',
    question:
      "Le reverse proxy Nginx renvoie 'HTTP 502 Bad Gateway'. Que signifie cette erreur ?",
    choices: [
      {
        id: 'a',
        text: "Le certificat TLS du serveur est expiré et le navigateur refuse la connexion",
      },
      {
        id: 'b',
        text: "Nginx ne peut pas établir la connexion vers le backend (port 3000 — connexion refusée)",
      },
      {
        id: 'c',
        text: "Le fichier de configuration Nginx contient une erreur de syntaxe",
      },
      {
        id: 'd',
        text: "La requête du client est malformée (en-têtes HTTP invalides)",
      },
    ],
  },
  {
    id: 'diagnostic_service',
    question:
      "D'après les logs systemd, quelle est la cause racine de l'échec du service myapp ?",
    choices: [
      {
        id: 'a',
        text: "EADDRINUSE : un processus fantôme occupe déjà le port 3000 lors du démarrage de myapp",
      },
      {
        id: 'b',
        text: "Le service manque de mémoire RAM (OOMKiller l'a tué)",
      },
      {
        id: 'c',
        text: "Le fichier de configuration de l'application est absent",
      },
      {
        id: 'd',
        text: "La base de données PostgreSQL est inaccessible depuis myapp",
      },
    ],
  },
  {
    id: 'remediation',
    question: 'Quelle est la séquence de remédiation correcte ?',
    choices: [
      {
        id: 'a',
        text: "Redémarrer le serveur entier pour libérer tous les ports",
      },
      {
        id: 'b',
        text: "Modifier le port d'écoute de myapp de 3000 vers 3001 dans sa configuration",
      },
      {
        id: 'c',
        text: "Identifier et tuer le processus occupant le port 3000 (lsof/kill), relancer myapp.service, vérifier avec 'ss -tlnp | grep 3000' et un test HTTP",
      },
      {
        id: 'd',
        text: "Désinstaller et réinstaller myapp depuis le gestionnaire de paquets",
      },
    ],
  },
];

/** Scénario S7 — Disque plein */
const SCENARIO_DISQUE_STEPS: ScenarioStep[] = [
  {
    id: 'diagnostic_volume',
    question:
      "D'après 'df -h', quel volume est saturé et quelle en est la cause principale identifiée par 'du' ?",
    choices: [
      {
        id: 'a',
        text: "Le volume /data (500G) est plein — les sauvegardes nocturnes l'ont saturé",
      },
      {
        id: 'b',
        text: "Le volume / est à 98% — /var/log/nginx (18G) et /var/log/myapp (12G) en sont les principales sources",
      },
      {
        id: 'c',
        text: "Le swap est saturé et provoque des erreurs d'allocation mémoire",
      },
      {
        id: 'd',
        text: "Un tmpfs en mémoire est plein à cause de fichiers temporaires non nettoyés",
      },
    ],
  },
  {
    id: 'diagnostic_logrotate',
    question:
      "Pourquoi les logs Nginx atteignent-ils 18 Go malgré une rotation hebdomadaire configurée ?",
    choices: [
      {
        id: 'a',
        text: "La directive 'postrotate' est absente de /etc/logrotate.d/nginx — Nginx ne rouvre pas son descripteur de fichier et continue d'écrire dans l'ancien",
      },
      {
        id: 'b',
        text: "Le cron logrotate ne s'est pas exécuté depuis plusieurs semaines",
      },
      {
        id: 'c',
        text: "La directive 'compress' produit des fichiers .gz encore plus volumineux que les originaux",
      },
      {
        id: 'd',
        text: "Le site génère un trafic anormalement élevé qui remplit les logs en quelques heures",
      },
    ],
  },
  {
    id: 'remediation_immediate',
    question: "Quelle est l'action immédiate pour libérer de l'espace sans risquer de pertes ?",
    choices: [
      {
        id: 'a',
        text: "Supprimer manuellement tous les fichiers de /var/log/nginx/*.log",
      },
      {
        id: 'b',
        text: "Arrêter Nginx le temps de nettoyer les logs puis le relancer",
      },
      {
        id: 'c',
        text: "Forcer la rotation avec 'logrotate -f /etc/logrotate.d/nginx', puis corriger la config en ajoutant la directive 'postrotate / nginx -s reopen / endscript'",
      },
      {
        id: 'd',
        text: "Réduire la rétention de rotate 52 à rotate 4 pour supprimer les archives",
      },
    ],
  },
  {
    id: 'remediation_preventive',
    question: 'Quelle mesure préventive structurelle proposez-vous pour éviter la récurrence ?',
    choices: [
      {
        id: 'a',
        text: "Désactiver la journalisation Nginx en production pour économiser l'espace",
      },
      {
        id: 'b',
        text: "Déplacer /var/log vers un point de montage sur le volume /data (500G) et configurer une alerte de supervision à 80%",
      },
      {
        id: 'c',
        text: "Compresser manuellement les logs chaque semaine avec un script cron",
      },
      {
        id: 'd',
        text: "Augmenter la taille du volume / en réduisant /data",
      },
    ],
  },
];

/** Scénario S10 — Mauvaise règle de pare-feu */
const SCENARIO_PARE_FEU_STEPS: ScenarioStep[] = [
  {
    id: 'diagnostic_ordre',
    question:
      'Comment nftables évalue-t-il les règles dans une chaîne FORWARD ?',
    choices: [
      {
        id: 'a',
        text: "De haut en bas : la première règle qui correspond au paquet est appliquée (first-match), les suivantes sont ignorées",
      },
      {
        id: 'b',
        text: "Toutes les règles sont évaluées et la règle la plus spécifique l'emporte",
      },
      {
        id: 'c',
        text: "De bas en haut : la dernière règle a la priorité la plus haute",
      },
      {
        id: 'd',
        text: "Les règles 'accept' sont toujours prioritaires sur les règles 'drop', quel que soit leur ordre",
      },
    ],
  },
  {
    id: 'diagnostic_regle',
    question:
      'Dans le ruleset nftables fourni, quelle règle bloque le trafic HTTPS (443) du VLAN 30 ?',
    choices: [
      {
        id: 'a',
        text: "La politique 'policy drop' de la chaîne FORWARD bloque tout par défaut",
      },
      {
        id: 'b',
        text: "La règle accept pour 10.10.10.0/24 est trop restrictive et bloque le VLAN 30",
      },
      {
        id: 'c',
        text: "La règle 'ip saddr 10.10.30.0/24 ip daddr 192.168.20.10 tcp dport 443 drop' précède la règle accept pour le même trafic",
      },
      {
        id: 'd',
        text: "La règle de logging 'log prefix drop' bloque le trafic avant la règle accept",
      },
    ],
  },
  {
    id: 'remediation',
    question:
      'Quelle est la correction minimale à appliquer (principe de moindre privilège) ?',
    choices: [
      {
        id: 'a',
        text: "Ajouter une règle 'accept' pour le VLAN 30 au-dessus de la règle drop existante",
      },
      {
        id: 'b',
        text: "Supprimer la règle 'drop' erronée pour 10.10.30.0/24/443 — la règle accept existante suffira",
      },
      {
        id: 'c',
        text: "Changer la politique de la chaîne FORWARD de 'drop' à 'accept'",
      },
      {
        id: 'd',
        text: "Déplacer la règle accept VLAN30 avant toutes les autres règles",
      },
    ],
  },
];

/** Registre des étapes par slug de lab */
export const SCENARIO_STEPS_BY_SLUG: Record<string, ScenarioStep[]> = {
  'scenario-dhcp-indisponible': SCENARIO_DHCP_STEPS,
  'scenario-dns-incorrect': SCENARIO_DNS_STEPS,
  'scenario-service-web-arrete': SCENARIO_SERVICE_WEB_STEPS,
  'scenario-disque-plein': SCENARIO_DISQUE_STEPS,
  'scenario-regle-pare-feu': SCENARIO_PARE_FEU_STEPS,
};
