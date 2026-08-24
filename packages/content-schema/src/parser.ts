import yaml from 'yaml';
import matter from 'gray-matter';
import { z } from 'zod';
import { formatZodError, LocalizedValidationError } from './formatter.js';

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: LocalizedValidationError[] };

export type MarkdownParseResult<T> =
  | { success: true; frontMatter: T; body: string }
  | { success: false; errors: LocalizedValidationError[] };

export function parseYamlContent<TOutput>(
  rawContent: string,
  schema: z.ZodType<TOutput, z.ZodTypeDef, unknown>,
  filePath: string
): ParseResult<TOutput> {
  let parsedJson: unknown;
  try {
    parsedJson = yaml.parse(rawContent);
  } catch (err: unknown) {
    const yamlMsg = err instanceof Error ? err.message : 'Erreur de syntaxe YAML';
    return {
      success: false,
      errors: [
        {
          filePath,
          field: '(syntaxe YAML)',
          message: yamlMsg,
        },
      ],
    };
  }

  if (!parsedJson || typeof parsedJson !== 'object') {
    return {
      success: false,
      errors: [
        {
          filePath,
          field: '(racine)',
          message: 'Le contenu YAML doit être un objet valide',
        },
      ],
    };
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    return {
      success: false,
      errors: formatZodError(result.error, filePath),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

export function parseMarkdownContent<TOutput>(
  rawContent: string,
  schema: z.ZodType<TOutput, z.ZodTypeDef, unknown>,
  filePath: string
): MarkdownParseResult<TOutput> {
  let parsedMatter: matter.GrayMatterFile<string>;
  try {
    parsedMatter = matter(rawContent);
  } catch (err: unknown) {
    const matterMsg = err instanceof Error ? err.message : 'Erreur lors de l’extraction du front matter';
    return {
      success: false,
      errors: [
        {
          filePath,
          field: '(front matter)',
          message: matterMsg,
        },
      ],
    };
  }

  const result = schema.safeParse(parsedMatter.data);
  if (!result.success) {
    return {
      success: false,
      errors: formatZodError(result.error as z.ZodError, filePath),
    };
  }

  return {
    success: true,
    frontMatter: result.data,
    body: parsedMatter.content,
  };
}
