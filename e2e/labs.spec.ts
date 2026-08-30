import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Utilitaire pour charger les fixtures
const loadFixture = (filename: string) => readFileSync(join(__dirname, 'fixtures', filename), 'utf-8');

test.describe('Labs avancés - WireGuard Site-à-Site', () => {
  test('session complète (succès)', async ({ page }) => {
    // 1. Connexion
    await login(page);

    // 2. Accès direct au lab
    await page.goto('/catalogue/vpn-acces-distants/labs/configuration-wireguard-site-to-site');
    await expect(page).toHaveURL(/\/catalogue\/vpn-acces-distants\/labs\/configuration-wireguard-site-to-site/, { timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // 3. Démarrer la session
    const startBtn = page.getByRole('button', { name: /démarrer la session/i });
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await startBtn.click();

    // Attendre l'apparition du bouton valider (qui indique que la session est en cours)
    const validateBtn = page.getByRole('button', { name: /valider mon travail/i });
    await expect(validateBtn).toBeVisible({ timeout: 10_000 });

    // 4. Remplir wg0-siege.conf
    const siegeValid = loadFixture('wg0-siege-valid.conf');
    await page.getByRole('button', { name: 'wg0-siege.conf' }).click();
    await page.locator('textarea').fill(siegeValid);

    // 5. Remplir wg0-filiale.conf
    const filialeValid = loadFixture('wg0-filiale-valid.conf');
    await page.getByRole('button', { name: 'wg0-filiale.conf' }).click();
    await page.locator('textarea').fill(filialeValid);

    // 6. Enregistrer
    await page.getByRole('button', { name: /enregistrer/i }).click();
    // Le bouton affiche brièvement "Enregistré !"
    await expect(page.getByRole('button', { name: /enregistré/i })).toBeVisible({ timeout: 5_000 });

    // 7. Valider mon travail
    await validateBtn.click();

    // 8. Vérifier le feedback positif
    await expect(page.getByText(/félicitations ! atelier réussi/i)).toBeVisible({ timeout: 10_000 });
  });

  test('fichiers invalides (échec de validation)', async ({ page }) => {
    await login(page);
    await page.goto('/catalogue/vpn-acces-distants/labs/configuration-wireguard-site-to-site');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Si une session est déjà en cours depuis un test précédent, on pourrait devoir l'abandonner.
    // L'idéal est de cliquer sur démarrer s'il est là.
    const startBtn = page.getByRole('button', { name: /démarrer (la|une nouvelle) session/i });
    const validateBtn = page.getByRole('button', { name: /valider mon travail/i });

    await expect(startBtn.or(validateBtn)).toBeVisible({ timeout: 15_000 });

    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    await expect(validateBtn).toBeVisible({ timeout: 10_000 });

    // Remplir une configuration invalide pour le siège
    const siegeInvalid = loadFixture('wg0-siege-invalid.conf');
    await page.getByRole('button', { name: 'wg0-siege.conf' }).click();
    await page.locator('textarea').fill(siegeInvalid);

    // Mettre la filiale valide
    const filialeValid = loadFixture('wg0-filiale-valid.conf');
    await page.getByRole('button', { name: 'wg0-filiale.conf' }).click();
    await page.locator('textarea').fill(filialeValid);

    // Enregistrer et valider
    await page.getByRole('button', { name: /enregistrer/i }).click();
    await expect(page.getByRole('button', { name: /enregistré/i })).toBeVisible({ timeout: 5_000 });
    await validateBtn.click();

    // Feedback d'échec
    await expect(page.getByText(/validation incomplète/i)).toBeVisible({ timeout: 10_000 });
    
    // Vérifier la présence du message d'erreur ciblé
    await expect(page.getByText(/L'interface du siège doit déclarer Address 10\.99\.0\.1\/24/i)).toBeVisible({ timeout: 5_000 });
  });

  test('demande d\'indice et abandon de session', async ({ page }) => {
    await login(page);
    await page.goto('/catalogue/vpn-acces-distants/labs/configuration-wireguard-site-to-site');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Démarrer la session
    const startBtn = page.getByRole('button', { name: /démarrer (la|une nouvelle) session/i });
    const validateBtn = page.getByRole('button', { name: /valider mon travail/i });

    await expect(startBtn.or(validateBtn)).toBeVisible({ timeout: 15_000 });

    if (await startBtn.isVisible()) {
      await startBtn.click();
    }
    
    await expect(validateBtn).toBeVisible({ timeout: 10_000 });

    // Demander un indice
    const hintBtn = page.getByRole('button', { name: /débloquer un indice/i });
    if (await hintBtn.isVisible()) {
      await hintBtn.click();
      // Confirmer l'utilisation des points s'il y a un confirm dialog du navigateur (via Playwright)
      // Playwright auto-accepte les dialogs par défaut, mais pour être sûr on peut écouter l'event:
      page.on('dialog', dialog => dialog.accept());
      
      // Vérifier que l'indice s'affiche (on cherche un bout de texte d'indice configuré dans le lab.yaml)
      await expect(page.getByText(/Chaque fichier contient \[Interface\]/i)).toBeVisible({ timeout: 10_000 });
    }

    // Abandonner la session
    const stopBtn = page.getByRole('button', { name: /abandonner la session/i });
    page.once('dialog', dialog => dialog.accept());
    await stopBtn.click();

    // Vérifier le retour au bouton de démarrage
    await expect(page.getByRole('button', { name: /démarrer une nouvelle session/i })).toBeVisible({ timeout: 10_000 });
  });
});
