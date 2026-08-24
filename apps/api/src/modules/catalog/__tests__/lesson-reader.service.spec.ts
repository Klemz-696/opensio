import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { LessonReaderService } from '../lesson-reader.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LessonReaderService (RM-13 / Sécurité)', () => {
  let service: LessonReaderService;
  const testContentRoot = path.resolve(__dirname, '../../../../../../content');

  beforeAll(() => {
    process.env.CONTENT_PATH = testContentRoot;
    service = new LessonReaderService();
  });

  it('lit correctement une leçon valide et extrait le corps Markdown sans frontmatter', async () => {
    const relativePath = 'tracks/annee-1/modules/reseaux-fondamentaux/lessons/01-adressage-ipv4.md';
    const content = await service.readLessonMarkdown(relativePath);

    expect(content).toBeDefined();
    expect(typeof content).toBe('string');
    expect(content).toContain('# Adressage IPv4 : Fondamentaux et Calcul de Sous-Réseaux');
    // Le frontmatter YAML ne doit pas être présent dans le corps extrait
    expect(content.startsWith('---')).toBe(false);
  });

  it('rejette les tentatives d\'échappement de répertoire (Path Traversal ../)', async () => {
    const maliciousPaths = [
      '../../package.json',
      '../../../etc/passwd',
      '..\\..\\apps\\api\\package.json',
      '/etc/shadow',
    ];

    for (const malPath of maliciousPaths) {
      await expect(service.readLessonMarkdown(malPath)).rejects.toThrow(
        expect.objectContaining({
          name: expect.stringMatching(/BadRequestException|NotFoundException/),
        }),
      );
    }
  });

  it('rejette les injections de caractère nul (%00 / \\0)', async () => {
    const nullBytePath = 'tracks/annee-1/lessons/01.md\0.txt';
    await expect(service.readLessonMarkdown(nullBytePath)).rejects.toThrow(BadRequestException);
  });

  it('lève une NotFoundException si le fichier n\'existe pas dans le répertoire de contenu', async () => {
    const nonExistentPath = 'tracks/annee-1/modules/inexistant/lessons/99-introuvable.md';
    await expect(service.readLessonMarkdown(nonExistentPath)).rejects.toThrow(NotFoundException);
  });

  it('lève une BadRequestException si le chemin cible est un dossier', async () => {
    const dirPath = 'tracks/annee-1/modules/reseaux-fondamentaux';
    await expect(service.readLessonMarkdown(dirPath)).rejects.toThrow(BadRequestException);
  });
});
