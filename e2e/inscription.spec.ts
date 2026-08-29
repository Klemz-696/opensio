import { test, expect } from '@playwright/test';

test.describe('Inscription', () => {
  test.skip('inscription → première leçon', async ({ page }) => {
    await page.goto('/register');
    
    // Remplir formulaire
    await page.getByLabel(/nom/i).fill('Test User');
    await page.getByLabel(/e-?mail/i).fill(`test+${Date.now()}@opensio.local`);
    await page.getByLabel(/mot de passe/i).fill('Test12345678!');
    await page.getByRole('button', { name: /s'inscrire/i }).click();
    
    // Attendre redirection vers le catalogue après inscription
    await expect(page).toHaveURL(/\/catalogue/, { timeout: 30_000 });
    
    // Vérifier accès à la première leçon du premier module
    await page.getByRole('link', { name: /accéder au module/i }).first().click();
    
    // La route du module est /catalogue/[moduleSlug], on attend donc cette URL
    await expect(page).toHaveURL(/\/catalogue\/[^\/]+$/, { timeout: 30_000 });
    
    // Cliquer sur la première leçon
    await page.getByRole('link', { name: /leçon|introduction|01/i }).first().click();
    
    // Attendre que la leçon se charge (/catalogue/[moduleSlug]/[lessonSlug])
    await expect(page).toHaveURL(/\/catalogue\/[^\/]+\/[^\/]+$/, { timeout: 30_000 });
    
    // Vérifier la présence du bouton de complétion ou du contenu
    await expect(page.getByRole('button', { name: /marquer comme terminée/i }).first()).toBeVisible({ timeout: 10_000 });
  });
});
