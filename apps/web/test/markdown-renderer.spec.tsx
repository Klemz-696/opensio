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

  // ── GFM Tables ──────────────────────────────────────────────────────────────

  it('rend un tableau GFM en <table> HTML avec en-tête et cellules (remark-gfm)', () => {
    const markdown = `
| Protocole | Port | Usage              |
|-----------|------|--------------------|
| HTTP      | 80   | Web non chiffré    |
| HTTPS     | 443  | Web chiffré (TLS)  |
| SSH       | 22   | Administration     |
    `;

    const { container } = render(<MarkdownRenderer content={markdown} />);

    // Un élément <table> doit être présent (role implicite "table")
    const table = container.querySelector('table');
    expect(table).not.toBeNull();

    // En-têtes de colonnes
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBe(3);
    expect(headers[0].textContent).toBe('Protocole');
    expect(headers[1].textContent).toBe('Port');
    expect(headers[2].textContent).toBe('Usage');

    // Cellules de données
    const cells = container.querySelectorAll('td');
    expect(cells.length).toBe(9); // 3 lignes × 3 colonnes
    expect(cells[0].textContent).toBe('HTTP');
    expect(cells[1].textContent).toBe('80');
  });

  it('entoure le tableau dans un wrapper scroll (lesson-prose-table-wrapper)', () => {
    const markdown = `
| A | B |
|---|---|
| 1 | 2 |
    `;

    const { container } = render(<MarkdownRenderer content={markdown} />);

    const wrapper = container.querySelector('.lesson-prose-table-wrapper');
    expect(wrapper).not.toBeNull();

    // Le <table> doit être enfant du wrapper
    const table = wrapper?.querySelector('table');
    expect(table).not.toBeNull();
  });

  // ── Formules KaTeX ───────────────────────────────────────────────────────────

  it('transforme une formule inline $…$ en markup KaTeX (classe .katex)', () => {
    const markdown = 'La formule entropie : $2^H$ bits sont nécessaires.';

    const { container } = render(<MarkdownRenderer content={markdown} />);

    // rehype-katex produit un <span class="katex"> pour les formules inline
    const katexEl = container.querySelector('.katex');
    expect(katexEl).not.toBeNull();
  });

  it('transforme une formule display $$…$$ en markup KaTeX display', () => {
    const markdown = `
Formule d'entropie de Shannon :

$$
H(X) = -\\sum_{i} p_i \\log_2 p_i
$$
    `;

    const { container } = render(<MarkdownRenderer content={markdown} />);

    // rehype-katex produit un <span class="katex-display"> pour les blocs display
    const katexDisplay = container.querySelector('.katex-display');
    expect(katexDisplay).not.toBeNull();
  });

  it('ne produit pas de markup KaTeX quand il n\'y a pas de formule', () => {
    const markdown = 'Un cours sans maths.';

    const { container } = render(<MarkdownRenderer content={markdown} />);

    // Aucune classe katex ne doit apparaître
    const katexEl = container.querySelector('.katex');
    expect(katexEl).toBeNull();
  });

  // ── Bi-theme tableaux ────────────────────────────────────────────────────────

  it('les tableaux GFM reçoivent la classe wrapper attendue quelle que soit la classe du document', () => {
    const markdown = `
| Clé   | Valeur |
|-------|--------|
| host  | 10.0.0.1 |
    `;

    // Simuler mode sombre : classe .dark sur le document
    document.documentElement.classList.add('dark');

    const { container } = render(<MarkdownRenderer content={markdown} />);

    const wrapper = container.querySelector('.lesson-prose-table-wrapper');
    expect(wrapper).not.toBeNull();

    const table = wrapper?.querySelector('table');
    expect(table).not.toBeNull();

    // Nettoyage
    document.documentElement.classList.remove('dark');
  });
});
