import { test, expect } from '@playwright/test';

test.describe('Mot de passe oublié', () => {
  test.skip('demande de réinitialisation de mot de passe', async ({ page }) => {
    await page.goto('/login');
    
    // Cliquer sur le lien "Mot de passe oublié ?" ou équivalent
    // Si le lien n'est pas trouvé avec le name, on tente avec href
    const forgotLink = page.locator('a[href*="forgot-password"]');
    await forgotLink.click();
    
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 });
    
    // Saisir l'email
    await page.getByLabel(/e-?mail/i).fill('student@opensio.local');
    await page.getByRole('button', { name: /réinitialiser|envoyer/i }).click();
    
    // Vérifier l'affichage du message de confirmation (générique pour la sécurité)
    await expect(page.getByText(/si cet email|lien a été envoyé|instructions/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
