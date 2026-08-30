# Tests E2E OpenSIO

## Architecture

- `prepare.mjs` : Reset DB `opensio_test` + seed + content:sync
- `playwright.config.ts` : Serveurs API + Web isolés (`reuseExistingServer: false`)
- `helpers.ts` : Fonctions utilitaires (`login()`, constantes)
- `*.spec.ts` : Tests par scénario métier

## Bonnes pratiques

- Un test = un fichier indépendant
- Timeout `toHaveURL` à `30_000` pour les routes Next.js dynamiques
- Sélecteurs robustes (`getByRole`, `aria-label`)
- Pas de dépendance entre tests (ordre d'exécution non garanti)

## Déboguer

```bash
# Mode UI (navigateur visible)
pnpm test:e2e --ui

# Rapport HTML
pnpm exec playwright show-report

# Trace détaillée
pnpm exec playwright show-trace test-results/<path>/trace.zip
```
