#!/usr/bin/env node

/**
 * Validateur du lab "Conception Relationnelle, Schéma DDL & Intégrité des Données SQL"
 * Conforme aux spécifications OpenSIO.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validateSqlSchema(workDir = '/work') {
  const filePath = join(workDir, 'schema.sql');

  const checks = [
    { id: 'tables_and_types_definition', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'integrity_constraints_and_fks', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'indexes_and_optimizations', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'reporting_view_and_aggregation', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier schema.sql introuvable dans le répertoire de travail.';
    checks[1].message = 'Validation impossible : fichier absent.';
    checks[2].message = 'Validation impossible : fichier absent.';
    checks[3].message = 'Validation impossible : fichier absent.';
    return {
      passed: false,
      score: 0,
      checks: checks.map(({ id, passed, points, message }) => ({ id, passed, points, message })),
    };
  }

  const rawContent = readFileSync(filePath, 'utf-8');

  // Nettoyage des commentaires SQL simples (-- ...) et multi-lignes (/* ... */)
  const cleanSql = rawContent
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // 1. Définition des Tables et Types (tables_and_types_definition)
  const hasDeptTable = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?departements\s*\(/i.test(cleanSql);
  const hasUserTable = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?utilisateurs\s*\(/i.test(cleanSql);
  const hasTicketTable = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?tickets_support\s*\(/i.test(cleanSql);
  const hasCommentTable = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?commentaires_ticket\s*\(/i.test(cleanSql);

  const hasTypes =
    /(?:VARCHAR|TEXT)/i.test(cleanSql) &&
    /(?:SERIAL|BIGSERIAL|INT|INTEGER|BIGINT)/i.test(cleanSql) &&
    /(?:BOOLEAN|BOOL)/i.test(cleanSql) &&
    /(?:TIMESTAMP)/i.test(cleanSql);

  if (!hasDeptTable || !hasUserTable || !hasTicketTable || !hasCommentTable) {
    checks[0].message = 'Les 4 tables requises (departements, utilisateurs, tickets_support, commentaires_ticket) doivent être créées.';
  } else if (!hasTypes) {
    checks[0].message = 'Les types de données SQL appropriés (VARCHAR/TEXT, SERIAL/BIGINT, BOOLEAN, TIMESTAMP) doivent être utilisés.';
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Création conforme des 4 tables relationnelles avec types de données adaptés.';
  }

  // 2. Contraintes d'intégrité et clés étrangères (integrity_constraints_and_fks)
  const hasPrimaryKeys =
    /PRIMARY\s+KEY/i.test(cleanSql);
  const hasFkDept =
    /FOREIGN\s+KEY.*REFERENCES\s+departements/i.test(cleanSql) ||
    /REFERENCES\s+departements\s*\(\s*id_departement\s*\)/i.test(cleanSql);
  const hasFkUser =
    /REFERENCES\s+utilisateurs/i.test(cleanSql);
  const hasCascade =
    /ON\s+DELETE\s+CASCADE/i.test(cleanSql);
  const hasSetNull =
    /ON\s+DELETE\s+SET\s+NULL/i.test(cleanSql);
  const hasUnique =
    /UNIQUE/i.test(cleanSql);
  const hasCheckPriority =
    /CHECK\s*\(\s*priorite\s+IN\s*\(\s*'BASSE'/i.test(cleanSql) ||
    /CHECK\s*\(.*'CRITIQUE'.*\)/i.test(cleanSql);
  const hasCheckStatus =
    /CHECK\s*\(\s*statut\s+IN\s*\(\s*'NOUVEAU'/i.test(cleanSql) ||
    /CHECK\s*\(.*'CLOS'.*\)/i.test(cleanSql);

  if (!hasPrimaryKeys) {
    checks[1].message = 'Les clés primaires (PRIMARY KEY) sont obligatoires sur chaque table.';
  } else if (!hasFkDept || !hasFkUser) {
    checks[1].message = 'Les clés étrangères reliant utilisateurs à departements et tickets à utilisateurs sont incomplètes.';
  } else if (!hasCascade || !hasSetNull) {
    checks[1].message = 'Les clauses de propagation d’intégrité référentielle ON DELETE CASCADE et ON DELETE SET NULL doivent être déclarées.';
  } else if (!hasUnique || !hasCheckPriority || !hasCheckStatus) {
    checks[1].message = 'Les contraintes d’intégrité (UNIQUE sur email/service et CHECK sur priorite/statut) sont requises.';
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Contraintes d’intégrité référentielle, clés étrangères avec CASCADE/SET NULL, contraintes UNIQUE et CHECK validées.';
  }

  // 3. Index & Optimisations (indexes_and_optimizations)
  const hasCompositeIndex =
    /CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-z0-9_]*\s+ON\s+tickets_support\s*\(\s*(?:statut\s*,\s*date_creation|date_creation\s*,\s*statut)\s*\)/i.test(cleanSql);
  const hasDemandeurIndex =
    /CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-z0-9_]*\s+ON\s+tickets_support\s*\(\s*id_demandeur\s*\)/i.test(cleanSql);
  const hasCommentTicketIndex =
    /CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-z0-9_]*\s+ON\s+commentaires_ticket\s*\(\s*id_ticket\s*\)/i.test(cleanSql);

  if (!hasCompositeIndex) {
    checks[2].message = 'L’index composite sur tickets_support(statut, date_creation) est manquant ou incomplet.';
  } else if (!hasDemandeurIndex) {
    checks[2].message = 'L’index sur la clé étrangère tickets_support(id_demandeur) est manquant.';
  } else if (!hasCommentTicketIndex) {
    checks[2].message = 'L’index sur commentaires_ticket(id_ticket) est manquant.';
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Indexation stratégique validée (index composite statut/date, index demandeur et index ticket).';
  }

  // 4. Vue de Reporting (reporting_view_and_aggregation)
  const hasView =
    /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+v_statistiques_departement\s+AS/i.test(cleanSql);
  const hasJoin =
    /(?:LEFT\s+)?JOIN/i.test(cleanSql);
  const hasCount =
    /COUNT\s*\(/i.test(cleanSql);
  const hasGroupBy =
    /GROUP\s+BY/i.test(cleanSql);

  if (!hasView) {
    checks[3].message = 'La vue v_statistiques_departement (CREATE VIEW ...) est introuvable.';
  } else if (!hasJoin) {
    checks[3].message = 'La vue doit effectuer des jointures (LEFT JOIN) entre départements, utilisateurs et tickets.';
  } else if (!hasCount || !hasGroupBy) {
    checks[3].message = 'La vue doit calculer des agrégations via COUNT(...) associées à une clause GROUP BY.';
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Vue de reporting v_statistiques_departement avec jointures, agrégations et regroupements validée.';
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
  const verdict = validateSqlSchema(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
