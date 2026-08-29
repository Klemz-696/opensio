import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('auth : connexion puis session restaurée après rechargement', async ({ page }) => {
  await login(page);
  await page.reload();
  await expect(page).toHaveURL(/\/catalogue/);
});

test('catalogue : module → leçon → marquer comme terminée', async ({ page }) => {
  await login(page);
  await page.goto('/catalogue');
  await page.getByRole('link', { name: /fondamentaux/i }).first().click();
  await expect(page).toHaveURL(/\/catalogue\/reseaux-fondamentaux/, { timeout: 30_000 });
  await page.getByRole('link', { name: /leçon|introduction|01/i }).first().click();
  await expect(page).toHaveURL(/\/catalogue\/reseaux-fondamentaux\/.+/, { timeout: 30_000 });
  await page.getByRole('button', { name: /marquer comme terminée/i }).click();
  await expect(page.getByText(/terminée|complétée/i).first()).toBeVisible({ timeout: 10_000 });
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