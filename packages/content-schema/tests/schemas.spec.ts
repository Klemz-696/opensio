import { describe, it, expect } from 'vitest';
import {
  TrackSchema,
  ModuleSchema,
  LessonFrontMatterSchema,
  QuizSchema,
  LabSchema,
  parseYamlContent,
  parseMarkdownContent,
  formatValidationErrorReport,
} from '../src/index.js';

describe('TrackSchema', () => {
  it('valide un track conforme', () => {
    const valid = {
      slug: 'annee-1',
      title: 'BTS SIO SISR — 1ère année',
      description: 'Fondamentaux des réseaux et systèmes',
      position: 1,
    };
    const parsed = TrackSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejette un slug non kebab-case', () => {
    const invalid = {
      slug: 'Annee_1!',
      title: 'Titre',
    };
    const parsed = TrackSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe('ModuleSchema', () => {
  it('valide un module conforme avec defaults', () => {
    const valid = {
      slug: 'reseaux-fondamentaux',
      title: 'Réseaux : fondamentaux',
      description: 'Adressage et routage',
      position: 1,
      difficulty: 2,
      estimated_minutes: 600,
      competency_refs: ['B2.1', 'B2.2'],
      lessons: ['adressage-ipv4'],
      quizzes: ['quiz-adressage'],
      labs: ['plan-adressage-pme'],
    };
    const parsed = ModuleSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejette une difficulté hors plage (ex: 6)', () => {
    const invalid = {
      slug: 'reseaux-fondamentaux',
      title: 'Réseaux',
      difficulty: 6,
    };
    const parsed = ModuleSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe('LessonFrontMatterSchema', () => {
  it('valide un front matter de leçon conforme', () => {
    const valid = {
      slug: 'adressage-ipv4',
      title: 'Adressage IPv4 : classes, masques et CIDR',
      difficulty: 2,
      estimated_minutes: 45,
      objectives: ['Calculer un masque'],
      prerequisites: [],
      competency_refs: ['B2.1'],
      success_criteria: ['Réussir le quiz'],
      labs: [{ slug: 'plan-adressage-pme', required: true }],
      references: [{ label: 'RFC 791', url: 'https://www.rfc-editor.org/rfc/rfc791' }],
    };
    const parsed = LessonFrontMatterSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejette une URL de référence invalide', () => {
    const invalid = {
      slug: 'adressage-ipv4',
      title: 'Titre',
      references: [{ label: 'RFC 791', url: 'pas-une-url' }],
    };
    const parsed = LessonFrontMatterSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe('QuizSchema', () => {
  it('valide un quiz conforme avec questions single et multiple', () => {
    const valid = {
      slug: 'quiz-adressage',
      title: 'Quiz — Adressage IPv4',
      passing_score: 80,
      questions: [
        {
          kind: 'single',
          prompt: 'Quelle est l’adresse réseau ?',
          choices: [
            { id: 'a', text: '192.168.1.0' },
            { id: 'b', text: '192.168.1.64' },
          ],
          correct: ['b'],
          explanation: 'Explication détaillée',
        },
        {
          kind: 'multiple',
          prompt: 'Sélectionnez les adresses privées',
          choices: [
            { id: 'a', text: '10.0.0.1' },
            { id: 'b', text: '172.16.0.1' },
            { id: 'c', text: '8.8.8.8' },
          ],
          correct: ['a', 'b'],
        },
      ],
    };
    const parsed = QuizSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejette une question single avec plus d’une bonne réponse', () => {
    const invalid = {
      slug: 'quiz-test',
      title: 'Quiz Test',
      questions: [
        {
          kind: 'single',
          prompt: 'Question ?',
          choices: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ],
          correct: ['a', 'b'],
        },
      ],
    };
    const parsed = QuizSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('rejette une réponse correcte inexistante dans les choix', () => {
    const invalid = {
      slug: 'quiz-test',
      title: 'Quiz Test',
      questions: [
        {
          kind: 'single',
          prompt: 'Question ?',
          choices: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ],
          correct: ['c'],
        },
      ],
    };
    const parsed = QuizSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe('LabSchema', () => {
  it('valide un lab niveau 2 conforme', () => {
    const valid = {
      slug: 'plan-adressage-pme',
      title: 'Plan d’adressage d’une PME',
      level: '2_files',
      max_score: 100,
      estimated_minutes: 40,
      context: 'Contexte PME...',
      objectives: ['Découper 10.20.0.0/24'],
      prerequisites: ['adressage-ipv4'],
      files: {
        editable: [{ path: 'plan.csv', description: 'Fichier CSV' }],
      },
      hints: [{ cost_percent: 10, text: 'Indice 1' }],
      validation: {
        type: 'script',
        image: 'opensio/validator-csv:latest',
        timeout_seconds: 30,
        checks: [{ id: 'subnets_valid', required: true, points: 60 }],
      },
      scoring: { floor_percent: 50 },
    };
    const parsed = LabSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('interdit les chemins relatifs avec ".." dans les fichiers modifiables', () => {
    const invalid = {
      slug: 'lab-fail',
      title: 'Lab Fail',
      context: 'Contexte',
      objectives: ['Obj'],
      files: {
        editable: [{ path: '../etc/passwd' }],
      },
    };
    const parsed = LabSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe('Parsing & Error formatting', () => {
  it('parseYamlContent retourne les données typées en cas de succès', () => {
    const yamlStr = `
slug: annee-1
title: "BTS SIO SISR — 1ère année"
position: 1
`;
    const res = parseYamlContent(yamlStr, TrackSchema, 'track.yaml');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.slug).toBe('annee-1');
    }
  });

  it('parseYamlContent retourne des erreurs localisées en cas d’échec', () => {
    const yamlStr = `
slug: ANNEE_1
# titre manquant
`;
    const res = parseYamlContent(yamlStr, TrackSchema, 'track.yaml');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors[0].filePath).toBe('track.yaml');
      const formatted = formatValidationErrorReport(res.errors);
      expect(formatted).toContain('track.yaml');
    }
  });

  it('parseMarkdownContent sépare le front matter et le corps markdown', () => {
    const mdStr = `---
slug: 01-intro
title: "Introduction"
---

# Titre du cours

Contenu pédagogique...
`;
    const res = parseMarkdownContent(mdStr, LessonFrontMatterSchema, '01-intro.md');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.frontMatter.slug).toBe('01-intro');
      expect(res.body.trim()).toContain('# Titre du cours');
    }
  });
});
