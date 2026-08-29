import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Labs', () => {
  test('démarrer une session de lab et valider', async ({ page }) => {
    await login(page);
    
    await page.goto('/catalogue/reseaux-fondamentaux');
    await expect(page).toHaveURL(/\/catalogue\/reseaux-fondamentaux/, { timeout: 30_000 });
    
    // Cliquer sur un lien de lab. Habituellement sous la forme "Accéder au lab" ou similaire
    // Cliquer sur un lien de lab. (le bouton indique "Démarrer" dans la liste)
    const labLink = page.getByRole('link', { name: /démarrer/i }).first();
    await labLink.click();
    
    await expect(page).toHaveURL(/\/catalogue\/.*\/labs\//, { timeout: 30_000 });
    
    // Attendre le chargement de la page de lab
    // Cliquer sur "Démarrer la session" ou "Lancer"
    const startBtn = page.getByRole('button', { name: /démarrer|lancer/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await startBtn.click();
    
    // Une fois la session démarrée, on devrait avoir un terminal et un bouton Valider
    // On vérifie que l'interface a changé en cherchant le bouton valider
    await expect(page.getByRole('button', { name: /valider mon travail/i }).first()).toBeVisible({ timeout: 15_000 });
  });
});
