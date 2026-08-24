import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { resolveContentRoot, resolveContentFilePath } from '../content-path.util';

describe('content-path.util (Résolution unifiée de la racine et des fichiers de contenu)', () => {
  const rootWorkspace = path.resolve(__dirname, '../../../../../../');
  const apiWorkspace = path.resolve(rootWorkspace, 'apps/api');
  const expectedContentDir = path.resolve(rootWorkspace, 'content');

  it('résout correctement la racine de contenu depuis la racine du monorepo', () => {
    const resolved = resolveContentRoot(undefined, rootWorkspace);
    expect(path.normalize(resolved)).toBe(path.normalize(expectedContentDir));
    expect(fs.existsSync(resolved)).toBe(true);
  });

  it('résout correctement la racine de contenu depuis apps/api sans CONTENT_PATH défini', () => {
    const resolved = resolveContentRoot(undefined, apiWorkspace);
    expect(path.normalize(resolved)).toBe(path.normalize(expectedContentDir));
    expect(fs.existsSync(resolved)).toBe(true);
  });

  it('résout correctement avec CONTENT_PATH = "./content" par défaut exécuté depuis apps/api', () => {
    const resolved = resolveContentRoot('./content', apiWorkspace);
    expect(path.normalize(resolved)).toBe(path.normalize(expectedContentDir));
    expect(fs.existsSync(resolved)).toBe(true);
  });

  it('respecte un chemin absolu personnalisé passé en paramètre ou via CONTENT_PATH', () => {
    const customAbsolute = path.resolve(rootWorkspace, 'content/tracks/annee-1');
    const resolved = resolveContentRoot(customAbsolute, apiWorkspace);
    expect(path.normalize(resolved)).toBe(path.normalize(customAbsolute));
  });

  it('résout un chemin relatif de lab.yaml vers son chemin absolu sur disque', () => {
    const labRelPath = 'tracks/annee-1/modules/reseaux-fondamentaux/labs/lab-plan-adressage/lab.yaml';
    const resolved = resolveContentFilePath(labRelPath, undefined, apiWorkspace);

    expect(fs.existsSync(resolved)).toBe(true);
    expect(resolved.endsWith(path.normalize(labRelPath))).toBe(true);
  });

  it('retourne le chemin absolu inchangé si déjà absolu', () => {
    const absPath = path.resolve(expectedContentDir, 'test.yaml');
    const resolved = resolveContentFilePath(absPath, undefined, apiWorkspace);
    expect(path.normalize(resolved)).toBe(path.normalize(absPath));
  });
});
