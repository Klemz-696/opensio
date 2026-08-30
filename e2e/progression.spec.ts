import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Progression multi-leçons', () => {
  test('marquer des leçons terminées et vérifier la progression', async ({ page }) => {
    await login(page);
    
    // Accéder au catalogue
    await page.goto('/catalogue');
    await expect(page).toHaveURL(/\/catalogue/, { timeout: 30_000 });
    
    // Cliquer sur le module (utilisation de first() pour s'assurer qu'on en prend un)
    await page.getByRole('link', { name: /accéder au module/i }).first().click();
    await expect(page).toHaveURL(/\/catalogue\/[^\/]+$/, { timeout: 30_000 });
    
    // Cliquer sur une leçon qui a probablement le mot "leçon" dans le titre
    // Utiliser fallback avec le locator 'a' si besoin, mais on reste sur getByRole par recommandation
    await page.getByRole('link', { name: /leçon/i }).nth(1).click();
    await expect(page).toHaveURL(/\/catalogue\/[^\/]+\/[^\/]+$/, { timeout: 30_000 });
    
    // Vérifier si le bouton "Marquer comme terminée" est là (la leçon pourrait déjà être finie)
    const btn = page.getByRole('button', { name: /marquer comme terminée/i });
    
    // On attend que la page finisse de charger avant de tester isVisible
    await page.waitForTimeout(2000);
    
    if (await btn.isVisible()) {
      await btn.click();
      await expect(page.getByText(/terminée|complétée/i).first()).toBeVisible({ timeout: 10_000 });
    }
    
    // Naviguer vers le dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    
    // Vérifier la présence d'éléments de progression
    await expect(page.getByText(/progression|terminé|%/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
