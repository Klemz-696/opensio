#!/usr/bin/env node

/**
 * Validateur du lab "Administration Système, Sécurité RBAC & Maintenance d'une Instance PostgreSQL"
 * Conforme aux spécifications OpenSIO.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function validatePostgresAdmin(workDir = '/work') {
  const filePath = join(workDir, 'admin_tasks.sql');

  const checks = [
    { id: 'roles_and_privileges_rbac', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'public_schema_hardening_and_revokes', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'maintenance_vacuum_analyze_reindex', passed: false, points: 0, maxPoints: 25, message: '' },
    { id: 'backup_restore_and_slow_query_config', passed: false, points: 0, maxPoints: 25, message: '' },
  ];

  if (!existsSync(filePath)) {
    checks[0].message = 'Fichier admin_tasks.sql introuvable dans le répertoire de travail.';
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

  // 1. Sécurité et Rôles RBAC (roles_and_privileges_rbac)
  const hasGroupRoles =
    /CREATE\s+ROLE\s+app_readonly(?:\s+WITH)?\s+NOLOGIN/i.test(rawContent) &&
    /CREATE\s+ROLE\s+app_readwrite(?:\s+WITH)?\s+NOLOGIN/i.test(rawContent);

  const hasGrantSelectReadonly =
    /GRANT\s+SELECT\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+TO\s+app_readonly/i.test(rawContent);

  const hasGrantDmlReadwrite =
    /GRANT\s+.*(?:INSERT|UPDATE|DELETE).*\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+TO\s+app_readwrite/i.test(rawContent);

  const hasGrantSequences =
    /GRANT\s+.*(?:USAGE|SELECT).*\s+ON\s+ALL\s+SEQUENCES\s+IN\s+SCHEMA\s+public\s+TO\s+app_readwrite/i.test(rawContent);

  const hasDefaultPrivileges =
    /ALTER\s+DEFAULT\s+PRIVILEGES/i.test(rawContent);

  const hasUsersCreated =
    /(?:CREATE\s+USER|CREATE\s+ROLE)\s+user_reporting.*PASSWORD/i.test(rawContent) &&
    /(?:CREATE\s+USER|CREATE\s+ROLE)\s+user_backend.*PASSWORD/i.test(rawContent);

  const hasUserRoleAssignments =
    /GRANT\s+app_readonly\s+TO\s+user_reporting/i.test(rawContent) &&
    /GRANT\s+app_readwrite\s+TO\s+user_backend/i.test(rawContent);

  if (!hasGroupRoles) {
    checks[0].message = 'Les rôles de groupe app_readonly et app_readwrite doivent être créés avec la directive NOLOGIN.';
  } else if (!hasGrantSelectReadonly || !hasGrantDmlReadwrite || !hasGrantSequences) {
    checks[0].message = 'Les privilèges SELECT, DML et SEQUENCES doivent être attribués précisément aux rôles correspondants.';
  } else if (!hasDefaultPrivileges) {
    checks[0].message = 'La clause ALTER DEFAULT PRIVILEGES est obligatoire pour garantir les droits sur les futures tables créées.';
  } else if (!hasUsersCreated || !hasUserRoleAssignments) {
    checks[0].message = 'Les utilisateurs user_reporting et user_backend doivent être créés avec mot de passe et rattachés à leurs groupes respectifs.';
  } else {
    checks[0].passed = true;
    checks[0].points = checks[0].maxPoints;
    checks[0].message = 'Modèle de sécurité RBAC (rôles groupes, utilisateurs nominatifs, privilèges et defaults) validé avec succès.';
  }

  // 2. Durcissement du Schéma Public (public_schema_hardening_and_revokes)
  const hasRevokeCreate =
    /REVOKE\s+(?:CREATE|ALL)\s+ON\s+SCHEMA\s+public\s+FROM\s+PUBLIC/i.test(rawContent);

  if (!hasRevokeCreate) {
    checks[1].message = 'Le durcissement du schéma public nécessite la commande : REVOKE CREATE ON SCHEMA public FROM PUBLIC;';
  } else {
    checks[1].passed = true;
    checks[1].points = checks[1].maxPoints;
    checks[1].message = 'Révocation des permissions par défaut sur le schéma public pour PUBLIC validée.';
  }

  // 3. Maintenance MVCC & Statistiques (maintenance_vacuum_analyze_reindex)
  const hasVacuum =
    /VACUUM\s*(?:\([^\)]*ANALYZE[^\)]*\)|ANALYZE)/i.test(rawContent);
  const hasReindex =
    /REINDEX\s+(?:TABLE|SCHEMA|DATABASE)/i.test(rawContent);
  const hasStatQuery =
    /SELECT[\s\S]*?FROM\s+pg_stat_user_tables/i.test(rawContent) &&
    /(?:n_dead_tup|n_live_tup)/i.test(rawContent);

  if (!hasVacuum) {
    checks[2].message = 'La commande de maintenance VACUUM (avec option ANALYZE) est requise pour nettoyer les tuples morts et mettre à jour les statistiques.';
  } else if (!hasReindex) {
    checks[2].message = 'Une commande de reconstruction d’index (REINDEX TABLE ou SCHEMA) doit être spécifiée.';
  } else if (!hasStatQuery) {
    checks[2].message = 'La requête de supervision des tables interrogeant pg_stat_user_tables (relname, n_dead_tup, n_live_tup) est absente.';
  } else {
    checks[2].passed = true;
    checks[2].points = checks[2].maxPoints;
    checks[2].message = 'Commandes de maintenance (VACUUM ANALYZE, REINDEX) et requête de suivi des tuples morts validées.';
  }

  // 4. pg_stat_statements & Sauvegarde / Restauration (backup_restore_and_slow_query_config)
  const hasStatExtension =
    /CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?pg_stat_statements/i.test(rawContent);
  const hasSlowQuerySql =
    /SELECT[\s\S]*?FROM\s+pg_stat_statements/i.test(rawContent) &&
    /(?:total_exec_time|total_time|mean_exec_time)/i.test(rawContent) &&
    /LIMIT\s+5/i.test(rawContent);
  const hasPgDumpCustom =
    /pg_dump\s+[\s\S]*?(?:-F\s*c|--format=c|--format=custom)/i.test(rawContent);
  const hasPgRestore =
    /pg_restore\s+/i.test(rawContent);

  if (!hasStatExtension) {
    checks[3].message = 'L’extension de diagnostic CREATE EXTENSION IF NOT EXISTS pg_stat_statements doit être déclarée.';
  } else if (!hasSlowQuerySql) {
    checks[3].message = 'La requête SQL identifiant le Top 5 des requêtes les plus consommatrices (ORDER BY total_exec_time DESC LIMIT 5) est manquante.';
  } else if (!hasPgDumpCustom || !hasPgRestore) {
    checks[3].message = 'Les commandes de sauvegarde au format Custom (pg_dump -F c) et de restauration (pg_restore) doivent être documentées.';
  } else {
    checks[3].passed = true;
    checks[3].points = checks[3].maxPoints;
    checks[3].message = 'Activation de pg_stat_statements, requête Top 5 et commandes pg_dump/pg_restore au format Custom validées.';
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
  const verdict = validatePostgresAdmin(workDir);
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(0);
}
