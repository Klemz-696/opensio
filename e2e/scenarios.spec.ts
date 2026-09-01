import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Scénarios de panne (Labs 1_theory) - S1 DHCP', () => {
  test('session complète (succès)', async ({ page }) => {
    await login(page);

    await page.goto('/catalogue/pannes-reseau/labs/scenario-dhcp-indisponible');
    await expect(page).toHaveURL(/\/catalogue\/pannes-reseau\/labs\/scenario-dhcp-indisponible/, { timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Démarrer la session
    const startBtn = page.getByRole('button', { name: /démarrer la session/i });
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await startBtn.click();

    // L'étape 1 doit s'afficher
    await expect(page.getByText(/Étape 1 \/ 3/i)).toBeVisible({ timeout: 10_000 });

    // Étape 1 : bonne réponse B
    await page.getByText(/Le poste n'a reçu aucune réponse DHCP/i).click();
    await page.getByRole('button', { name: /suivant/i }).click();

    // Étape 2 : s'affiche
    await expect(page.getByText(/Étape 2 \/ 3/i)).toBeVisible({ timeout: 5_000 });
    // Étape 2 : bonne réponse C
    await page.getByText(/option 'routers' \(192\.168\.99\.1\) n'appartient pas/i).click();
    await page.getByRole('button', { name: /suivant/i }).click();

    // Étape 3 : s'affiche
    await expect(page.getByText(/Étape 3 \/ 3/i)).toBeVisible({ timeout: 5_000 });
    // Étape 3 : bonne réponse A
    await page.getByText(/Remplacer 'option routers 192\.168\.99\.1'/i).click();
    
    // Valider
    const validateBtn = page.getByRole('button', { name: /valider ma résolution/i });
    await validateBtn.click();

    // Vérifier le feedback positif
    await expect(page.getByText(/félicitations ! atelier réussi/i)).toBeVisible({ timeout: 10_000 });
  });

  test('fichiers invalides (échec de validation)', async ({ page }) => {
    await login(page);
    await page.goto('/catalogue/pannes-reseau/labs/scenario-dhcp-indisponible');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Démarrer la session ou utiliser la courante
    const startBtn = page.getByRole('button', { name: /démarrer (la|une nouvelle) session/i });
    
    if (await startBtn.isVisible()) {
      await startBtn.click();
    } else {
      // Si une session est déjà en cours on l'abandonne pour repartir propre
      const stopBtn = page.getByRole('button', { name: /abandonner la session/i });
      if (await stopBtn.isVisible()) {
        page.once('dialog', dialog => dialog.accept());
        await stopBtn.click();
        await expect(startBtn).toBeVisible({ timeout: 10_000 });
        await startBtn.click();
      }
    }

    // Étape 1 : mauvaise réponse A
    await expect(page.getByText(/Étape 1 \/ 3/i)).toBeVisible({ timeout: 10_000 });
    await page.getByText(/Conflit d'adresses IP/i).click();
    await page.getByRole('button', { name: /suivant/i }).click();

    // Étape 2 : bonne réponse C
    await expect(page.getByText(/Étape 2 \/ 3/i)).toBeVisible({ timeout: 5_000 });
    await page.getByText(/option 'routers'/i).click();
    await page.getByRole('button', { name: /suivant/i }).click();

    // Étape 3 : mauvaise réponse B
    await expect(page.getByText(/Étape 3 \/ 3/i)).toBeVisible({ timeout: 5_000 });
    await page.getByText(/Changer le sous-réseau/i).click();
    
    // Valider
    const validateBtn = page.getByRole('button', { name: /valider ma résolution/i });
    await validateBtn.click();

    // Feedback d'échec
    await expect(page.getByText(/validation incomplète/i)).toBeVisible({ timeout: 10_000 });
    // On devrait voir l'erreur pour la première étape
    await expect(page.getByText(/Une adresse APIPA signifie l'absence de bail DHCP/i)).toBeVisible({ timeout: 5_000 });
  });

  test('demande d\'indice', async ({ page }) => {
    await login(page);
    await page.goto('/catalogue/pannes-reseau/labs/scenario-dhcp-indisponible');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Démarrer la session ou utiliser la courante
    const startBtn = page.getByRole('button', { name: /démarrer (la|une nouvelle) session/i });
    
    if (await startBtn.isVisible()) {
      await startBtn.click();
    } else {
      const stopBtn = page.getByRole('button', { name: /abandonner la session/i });
      if (await stopBtn.isVisible()) {
        page.once('dialog', dialog => dialog.accept());
        await stopBtn.click();
        await expect(startBtn).toBeVisible({ timeout: 10_000 });
        await startBtn.click();
      }
    }
    
    await expect(page.getByText(/Étape 1 \/ 3/i)).toBeVisible({ timeout: 10_000 });

    // Demander un indice
    const hintBtn = page.getByRole('button', { name: /débloquer un indice/i });
    if (await hintBtn.isVisible()) {
      page.once('dialog', dialog => dialog.accept());
      await hintBtn.click();
      
      // L'indice du lab S1 doit apparaître
      await expect(page.getByText(/Vérifiez d'abord si le service DHCP est actif/i)).toBeVisible({ timeout: 10_000 });
    }
    
    // Abandonner la session
    const stopBtn = page.getByRole('button', { name: /abandonner la session/i });
    page.once('dialog', dialog => dialog.accept());
    await stopBtn.click();
  });
});
