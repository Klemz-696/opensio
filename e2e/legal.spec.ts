import { test, expect } from '@playwright/test';

test.describe('Pages légales', () => {
  test('Mentions Légales se charge et affiche son titre sans connexion', async ({ page }) => {
    const response = await page.goto('/mentions-legales');
    expect(response?.status()).toBe(200);
    
    const title = page.getByRole('heading', { name: 'Mentions Légales', level: 1 });
    await expect(title).toBeVisible();
  });

  test('Politique de confidentialité se charge et affiche son titre sans connexion', async ({ page }) => {
    const response = await page.goto('/confidentialite');
    expect(response?.status()).toBe(200);
    
    const title = page.getByRole('heading', { name: 'Politique de Confidentialité', level: 1 });
    await expect(title).toBeVisible();
  });

  test('Les liens du footer légal sont présents sur la page de connexion', async ({ page }) => {
    await page.goto('/login');
    
    const linkMentions = page.getByRole('link', { name: 'Mentions légales' });
    await expect(linkMentions).toBeVisible();
    await expect(linkMentions).toHaveAttribute('href', '/mentions-legales');

    const linkConf = page.getByRole('link', { name: 'Politique de confidentialité' });
    await expect(linkConf).toBeVisible();
    await expect(linkConf).toHaveAttribute('href', '/confidentialite');
  });

  test('La mention d\'acceptation RGPD est présente sur la page d\'inscription', async ({ page }) => {
    await page.goto('/register');
    
    const textNode = page.getByText('En créant un compte, vous acceptez la');
    await expect(textNode).toBeVisible();

    const linkConf = page.getByRole('link', { name: 'politique de confidentialité', exact: true });
    await expect(linkConf).toBeVisible();
    await expect(linkConf).toHaveAttribute('href', '/confidentialite');
  });
});
