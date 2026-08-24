import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownRenderer } from '../components/lessons/markdown-renderer';

// Mock pour Shiki afin d'éviter les opérations de chargement WASM lourdes en test unitaire
vi.mock('shiki', () => ({
  codeToHtml: vi.fn().mockImplementation(async (code: string) => {
    return `<pre><code>${code}</code></pre>`;
  }),
}));

describe('MarkdownRenderer (Sécurité & Rendu §30)', () => {
  it('rend correctement les titres, paragraphes et listes', () => {
    const markdown = `
# Titre de Niveau 1
Voici un paragraphe de cours.

- Point 1
- Point 2
    `;

    render(<MarkdownRenderer content={markdown} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Titre de Niveau 1' })).toBeDefined();
    expect(screen.getByText('Voici un paragraphe de cours.')).toBeDefined();
    expect(screen.getByText('Point 1')).toBeDefined();
  });

  it('applique target=_blank et rel=noopener noreferrer sur les liens externes', () => {
    const markdown = '[RFC 791](https://www.rfc-editor.org/rfc/rfc791)';
    render(<MarkdownRenderer content={markdown} />);

    const link = screen.getByRole('link', { name: 'RFC 791' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('https://www.rfc-editor.org/rfc/rfc791');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('neutralise les scripts et balises dangereuses via rehype-sanitize', () => {
    const maliciousMarkdown = `
Texte sain.
<script>alert('xss')</script>
<img src="x" onerror="alert('xss')" />
    `;

    const { container } = render(<MarkdownRenderer content={maliciousMarkdown} />);
    expect(container.querySelector('script')).toBeNull();
    const img = container.querySelector('img');
    if (img) {
      expect(img.getAttribute('onerror')).toBeNull();
    }
  });
});
