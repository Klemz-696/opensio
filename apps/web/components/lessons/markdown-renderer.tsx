'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { CodeBlock } from './code-block';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Balises HTML produites par rehype-katex (MathML + SVG inline).
 * Elles doivent être autorisées dans le schéma de sanitization pour que
 * les formules ne soient pas supprimées par rehype-sanitize.
 * Voir https://github.com/rehypejs/rehype-sanitize#example-math
 */
const KATEX_ELEMENTS = [
  'math', 'semantics', 'mrow', 'mn', 'mi', 'mo', 'msup', 'msub',
  'mfrac', 'annotation', 'mtext', 'mspace', 'mover', 'munder',
  'mtable', 'mtr', 'mtd', 'mstyle', 'merror', 'mpadded', 'mphantom',
  'msqrt', 'mroot', 'mmultiscripts', 'mprescripts', 'none',
  'svg', 'path', 'line', 'rect', 'g', 'defs', 'use', 'circle',
];

// Schéma de sanitization strict étendant le schéma par défaut GitHub
const customSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    ...KATEX_ELEMENTS,
  ],
  attributes: {
    ...defaultSchema.attributes,
    // Éléments KaTeX : permettre class, style, aria-hidden
    '*': ['className', 'style', 'aria-hidden', 'aria-label', 'role', 'id'],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style', 'aria-hidden'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className', 'style'],
    a: [...(defaultSchema.attributes?.a ?? []), 'target', 'rel', 'href'],
    // SVG KaTeX
    svg: ['viewBox', 'xmlns', 'role', 'focusable', 'width', 'height', 'style', 'aria-hidden', 'className'],
    path: ['d', 'fill', 'stroke', 'strokeWidth', 'fillRule'],
    rect: ['x', 'y', 'width', 'height', 'fill'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth'],
    g: ['transform'],
    use: ['href', 'x', 'y'],
    // MathML attributes
    math: ['xmlns', 'display', 'className'],
    annotation: ['encoding'],
    mspace: ['width', 'height', 'depth'],
    mstyle: ['mathsize', 'mathcolor', 'displaystyle'],
  },
};

/**
 * Ordre des plugins rehype :
 *   1. rehypeKatex  → génère le HTML math
 *   2. rehypeSanitize → filtre XSS (doit être APRÈS katex pour ne pas détruire les balises math)
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="lesson-prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeSanitize, customSanitizeSchema]]}
        components={{
          // Wrapper table pour le scroll horizontal sur mobile
          table(props) {
            const { children, ...rest } = props;
            return (
              <div className="lesson-prose-table-wrapper">
                <table {...rest}>{children}</table>
              </div>
            );
          },
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const isCodeBlock = match || String(children).includes('\n');

            if (isCodeBlock) {
              return (
                <CodeBlock
                  code={String(children).replace(/\n$/, '')}
                  language={match ? match[1] : 'text'}
                />
              );
            }

            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
          a(props) {
            const href = props.href || '';
            const isExternal = href.startsWith('http://') || href.startsWith('https://');

            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline underline-offset-4"
              >
                {props.children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
