import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Quiz Retry', () => {
  test('échouer un quiz (0%) puis utiliser le bouton retenter', async ({ page }) => {
    await login(page);
    
    await page.goto('/catalogue/reseaux-fondamentaux');
    await expect(page).toHaveURL(/\/catalogue\/reseaux-fondamentaux/, { timeout: 30_000 });
    
    // Cliquer sur le premier quiz ("Passer le quiz" ou "Retenter")
    await page.getByRole('link', { name: /quiz|retenter/i }).first().click();
    await expect(page).toHaveURL(/\/quiz\//, { timeout: 30_000 });
    
    // Passer directement à la soumission sans répondre (0%)
    await page.getByRole('button', { name: 'Revoir mes réponses' }).click();
    let soumettreBtn = page.getByRole('button', { name: /soumettre/i }).first();
    await soumettreBtn.click();
    
    // Vérifier qu'on voit le score (0%)
    await expect(page.getByText(/score/i).first()).toBeVisible({ timeout: 10_000 });
    
    // Le bouton Retenter / Recommencer doit être là
    const retenterBtn = page.getByRole('button', { name: /retenter|recommencer/i }).first();
    await expect(retenterBtn).toBeVisible();
    
    // On recommence
    await retenterBtn.click();
    
    // On devrait être de retour sur les questions
    await expect(page.getByRole('button', { name: 'Revoir mes réponses' })).toBeVisible({ timeout: 10_000 });
    
    // On répond à une question cette fois-ci
    await page.locator('button.text-left').first().click();
    
    // On resoumet
    await page.getByRole('button', { name: 'Revoir mes réponses' }).click();
    soumettreBtn = page.getByRole('button', { name: /soumettre/i }).first();
    await soumettreBtn.click();
    
    // Vérifier l'apparition du score à nouveau
    await expect(page.getByText(/score/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
