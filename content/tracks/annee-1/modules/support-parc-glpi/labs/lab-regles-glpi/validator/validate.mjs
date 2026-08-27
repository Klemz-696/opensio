#!/usr/bin/env node

/**
 * Validateur du lab "Règles de Routage de Tickets et SLA dans GLPI"
 * Conforme au contrat OpenSIO (§26.3 et §53 Annexe D).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateGlpiRules(workDir = '/work') {
  const filePath = join(workDir, 'rules.json');

  const checks = [
    { id: 'json_structure_and_rules_count', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'vip_rule_configuration', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'network_rule_configuration', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'office_rule_configuration', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier rules.json introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  let data;
  try {
    const rawContent = readFileSync(filePath, 'utf-8');
    data = JSON.parse(rawContent);
  } catch (err) {
    checks[0].message = `Erreur de syntaxe JSON dans rules.json : ${err.message}`;
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rules = Array.isArray(data.rules) ? data.rules : [];

  if (rules.length < 3) {
    checks[0].message = `Le fichier doit contenir au moins 3 règles métier complètes (trouvées : ${rules.length}).`;
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Structure JSON valide et présence des 3 règles métier vérifiées.';
  }

  // Fonction utilitaire de recherche
  const findRule = (keyword) =>
    rules.find(
      (r) =>
        (r.id && r.id.toLowerCase().includes(keyword)) ||
        (r.name && r.name.toLowerCase().includes(keyword)) ||
        JSON.stringify(r.conditions || {}).toLowerCase().includes(keyword),
    );

  // 1. Règle VIP (vip_rule_configuration)
  const vipRule = findRule('vip') || findRule('direction');
  if (!vipRule) {
    checks[1].message = 'Règle métier pour les incidents VIP / Direction introuvable.';
  } else {
    const actions = vipRule.actions || {};
    const group = (actions.groupe_technicien || '').toLowerCase();
    const tto = Number(actions.sla_tto_minutes);
    const ttr = Number(actions.sla_ttr_minutes);

    const hasVipGroup = group.includes('vip') || group.includes('n2') || group.includes('support');
    const isTtrValid = ttr > 0 && ttr <= 120;
    const isTtoValid = tto > 0 && tto <= 30;

    if (!hasVipGroup) {
      checks[1].message = "La règle VIP doit affecter le ticket à un groupe spécialisé (ex: 'Support N2 VIP').";
    } else if (!isTtrValid) {
      checks[1].message = "Le SLA TTR de la règle VIP doit être <= 120 minutes (2 heures).";
    } else if (!isTtoValid) {
      checks[1].message = "Le SLA TTO de la règle VIP doit être <= 15-30 minutes.";
    } else {
      checks[1].passed = true;
      checks[1].points = checks[1].maxPoints;
      checks[1].message = 'Règle VIP et engagements SLA (TTO <= 15min, TTR <= 2h) validés.';
    }
  }

  // 2. Règle Réseau (network_rule_configuration)
  const netRule = findRule('reseau') || findRule('switch') || findRule('vlan');
  if (!netRule) {
    checks[2].message = 'Règle métier pour les pannes réseau introuvable.';
  } else {
    const actions = netRule.actions || {};
    const group = (actions.groupe_technicien || '').toLowerCase();
    const ttr = Number(actions.sla_ttr_minutes);

    const hasNetGroup = group.includes('reseau') || group.includes('securite') || group.includes('infra');
    const isTtrValid = ttr > 0 && ttr <= 240;

    if (!hasNetGroup) {
      checks[2].message = "La règle Réseau doit affecter le ticket au groupe 'Equipe Reseau & Securite'.";
    } else if (!isTtrValid) {
      checks[2].message = "Le SLA TTR de la règle Réseau doit être <= 240 minutes (4 heures).";
    } else {
      checks[2].passed = true;
      checks[2].points = checks[2].maxPoints;
      checks[2].message = 'Règle Panne Réseau et affectation technique validées.';
    }
  }

  // 3. Règle Bureautique (office_rule_configuration)
  const officeRule = findRule('bureautique') || findRule('demande') || findRule('poste') || findRule('standard');
  if (!officeRule) {
    checks[3].message = 'Règle métier pour les demandes bureautiques introuvable.';
  } else {
    const actions = officeRule.actions || {};
    const group = (actions.groupe_technicien || '').toLowerCase();
    const ttr = Number(actions.sla_ttr_minutes);

    const hasOfficeGroup = group.includes('n1') || group.includes('service') || group.includes('support') || group.includes('centre');
    const isTtrValid = ttr > 0 && ttr <= 1440;

    if (!hasOfficeGroup) {
      checks[3].message = "La règle Bureautique doit affecter le ticket au groupe 'Centre de Services N1'.";
    } else if (!isTtrValid) {
      checks[3].message = "Le SLA TTR de la règle Bureautique doit être <= 1440 minutes (24 heures).";
    } else {
      checks[3].passed = true;
      checks[3].points = checks[3].maxPoints;
      checks[3].message = 'Règle Demandes Bureautique et SLA de traitement validés.';
    }
  }

  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const allRequiredPassed = checks.every((c) => c.passed);

  return {
    passed: allRequiredPassed && totalScore >= 80,
    score: totalScore,
    checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  const workDir = process.env.WORK_DIR || process.argv[2] || '/work';
  const verdict = validateGlpiRules(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
