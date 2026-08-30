import { expect, type Page } from '@playwright/test';

export const STUDENT = {
  email: 'student@opensio.local',
  password: 'StudentOpenSIO2026!',
};

export async function login(page: Page) {
  await page.goto('/login');

  // Champ email : textbox avec placeholder "etudiant@opensio.local"
  await page
    .getByRole('textbox', { name: 'etudiant@opensio.local' })
    .fill(STUDENT.email);

  // Champ mot de passe : pas de label, on cible par type="password"
  await page.locator('input[type="password"]').fill(STUDENT.password);

  // Bouton de soumission
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Attendre la redirection vers le catalogue
  await expect(page).toHaveURL(/\/catalogue/, { timeout: 15_000 });
}