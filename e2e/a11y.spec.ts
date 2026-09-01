import { test, expect } from '@playwright/test';
import { login } from './helpers';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  { name: 'Login', path: '/login', requiresAuth: false },
  { name: 'Register', path: '/register', requiresAuth: false },
  { name: 'Mentions Légales', path: '/mentions-legales', requiresAuth: false },
  { name: 'Confidentialité', path: '/confidentialite', requiresAuth: false },
  { name: 'Catalogue', path: '/catalogue', requiresAuth: true },
  { name: 'Leçon', path: '/catalogue/reseaux-fondamentaux/lecon-1', requiresAuth: true },
  { name: 'Quiz', path: '/catalogue/reseaux-fondamentaux/quiz', requiresAuth: true }, // Might need dynamic path if it changes
  { name: 'Lab Scenario S1', path: '/scenarios/s1', requiresAuth: true },
  { name: 'Dashboard', path: '/dashboard', requiresAuth: true },
  { name: 'Admin', path: '/admin', requiresAuth: true, admin: true }
];

test.describe('A11y Audit', () => {
  for (const route of ROUTES) {
    test(`A11y on ${route.name} (Clair & Sombre)`, async ({ page }) => {
      if (route.requiresAuth) {
        if (route.admin) {
           // We'll need a helper for admin login if it exists, otherwise just login
           // From helpers.ts, we have `login` and `loginAdmin`
           const { loginAdmin } = await import('./helpers');
           await loginAdmin(page);
        } else {
           await login(page);
        }
      }
      
      await page.goto(route.path);
      // Wait for network idle or main content to load
      await page.waitForLoadState('networkidle');

      // Test en mode clair (par défaut ou forcé)
      await page.emulateMedia({ colorScheme: 'light' });
      // Attendre un peu si le changement est asynchrone (Next-themes peut réagir)
      await page.waitForTimeout(500);
      
      const axeClair = new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
      
      const resultsClair = await axeClair.analyze();
      expect(resultsClair.violations).toEqual([]);

      // Test en mode sombre
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);

      const axeSombre = new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
      
      const resultsSombre = await axeSombre.analyze();
      expect(resultsSombre.violations).toEqual([]);
    });
  }
});
