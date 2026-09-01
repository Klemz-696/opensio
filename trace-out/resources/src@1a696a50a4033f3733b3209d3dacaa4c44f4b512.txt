import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('auth : connexion puis session restaurée après rechargement', async ({ page }) => {
  await login(page);
  await page.reload();
  await expect(page).toHaveURL(/\/catalogue/);
});

test('catalogue : module → leçon → marquer comme terminée', async ({ page }) => {
  await login(page);
  // Navigation directe au module pour éviter les aléas du rendu côté client du catalogue
  await page.goto('/catalogue/reseaux-fondamentaux');
  await expect(page).toHaveURL(/\/catalogue\/reseaux-fondamentaux/, { timeout: 30_000 });
  // Attendre que la liste des leçons soit rendue (la page est client-side)
  await page.getByRole('heading', { name: /leçons du module/i }).waitFor({ timeout: 15_000 });
  await page.getByRole('link', { name: /lire la leçon|revoir la leçon/i }).first().click();
  await expect(page).toHaveURL(/\/catalogue\/reseaux-fondamentaux\/.+/, { timeout: 30_000 });
  // Attendre que le bouton soit présent (la page leçon est server-side mais peut être lente en CI)
  const btn = page.getByRole('button', { name: /marquer comme terminée/i });
  await btn.waitFor({ state: 'visible', timeout: 15_000 });
  await btn.click();
  await expect(page.getByText(/leçon validée|terminée/i).first()).toBeVisible({ timeout: 10_000 });
});

test('quiz : répondre, soumettre, voir le score', async ({ page }) => {
  await login(page);
  await page.goto('/catalogue/reseaux-fondamentaux');
  await page.getByRole('link', { name: /quiz/i }).first().click();
  await expect(page).toHaveURL(/\/quiz\//, { timeout: 30_000 });
  await page.locator('button.text-left').first().click();
  await page.getByRole('button', { name: 'Revoir mes réponses' }).click();
  const soumettre = page.getByRole('button', { name: /soumettre/i }).first();
  await soumettre.click();
  await expect(page.getByText(/score|résultat/i).first()).toBeVisible({ timeout: 10_000 });
});