import { getSingletonHighlighter } from 'shiki';

type Highlighter = Awaited<ReturnType<typeof getSingletonHighlighter>>;

let highlighter: Highlighter | null = null;
const cache = new Map<string, string>();

export async function getHtml(code: string, lang: string): Promise<string> {
  const key = `${lang}::${code}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  if (!highlighter) {
    highlighter = await getSingletonHighlighter({
      langs: ['ts', 'bash', 'sh', 'yaml', 'json', 'nginx', 'openssl', 'conf'],
      themes: ['one-dark-pro'],
    });
  }

  const result = highlighter.codeToHtml(code, { lang, theme: 'one-dark-pro' });
  cache.set(key, result.html);
  return result.html;
}

// Pour invalider le cache si nécessaire (ex: hot-reload thème)
export function clearHighlightCache(): void {
  cache.clear();
}