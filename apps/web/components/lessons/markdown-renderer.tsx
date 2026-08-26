'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CodeBlock } from './code-block';

interface MarkdownRendererProps {
  content: string;
}

// Schéma de sanitization strict étendant le schéma par défaut GitHub
const customSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className'],
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel', 'href'],
  },
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="lesson-prose max-w-none">
      <ReactMarkdown
        rehypePlugins={[[rehypeSanitize, customSanitizeSchema]]}
        components={{
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
