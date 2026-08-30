import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Dashboard Etudiant', () => {
  test('vérification de l\'affichage des stats', async ({ page }) => {
    // 1. Connexion en tant qu'étudiant
    await login(page);

    // 2. Accès direct au dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    
    // Attendre que la page charge (on peut chercher une des cartes de stats)
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    
    // 3. Vérifier les stats globales (il y a souvent le mot "progression", "leçons", etc.)
    await expect(page.getByText(/Progression globale/i).first()).toBeVisible();
    await expect(page.getByText(/Leçons terminées/i).first()).toBeVisible();

    // 4. Vérifier l'activité récente
    const activitySection = page.getByText(/Activité récente/i);
    await expect(activitySection).toBeVisible();

    // On s'assure qu'au moins une des deux possibilités est affichée (vide ou liste)
    // sans bloquer si le seed ne génère pas d'activité pour cet utilisateur.
    const emptyMessage = page.getByText(/Aucun événement d'activité/i);
    const activityList = page.locator('div.glass-panel').filter({ hasText: /Activité récente/i }).locator('div.space-y-3');
    
    await expect(emptyMessage.or(activityList)).toBeVisible();
  });
});
