'use client';

import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { Check, Copy, Terminal } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cleanCode = code.trim();
  const lang = (language || 'text').toLowerCase();

  useEffect(() => {
    let isMounted = true;

    async function highlight() {
      try {
        const supportedLangs = ['bash', 'sh', 'python', 'json', 'yaml', 'yml', 'javascript', 'js', 'typescript', 'ts', 'css', 'html', 'markdown', 'md'];
        const targetLang = supportedLangs.includes(lang) ? lang : 'text';

        const html = await codeToHtml(cleanCode, {
          lang: targetLang,
          themes: {
            light: 'github-light-default',
            dark: 'github-dark-default',
          },
          defaultColor: false,
        });

        if (isMounted) {
          setHighlightedHtml(html);
        }
      } catch {
        if (isMounted) {
          setHighlightedHtml(null);
        }
      }
    }

    void highlight();

    return () => {
      isMounted = false;
    };
  }, [cleanCode, lang]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignorer si l'accès presse-papier est restreint
    }
  };

  return (
    <div className="relative my-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 shadow-md dark:shadow-xl group">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span className="font-mono font-semibold uppercase text-[11px] text-slate-700 dark:text-slate-300">{lang}</span>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent transition-all text-[11px] cursor-pointer"
          title="Copier le code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copié !</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>

      {/* Sécurité (§30) : le HTML injecté provient exclusivement de codeToHtml (Shiki),
          qui échappe le contenu texte par construction. Aucun HTML brut issu du Markdown
          n'entre dans ce composant. Ne jamais passer ici du HTML non généré par Shiki. */}
      <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        {highlightedHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            className="[&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0 [&_code]:!bg-transparent"
          />
        ) : (
          <pre className="text-slate-800 dark:text-slate-200">
            <code>{cleanCode}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

