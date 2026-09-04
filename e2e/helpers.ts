import { expect, type Page } from '@playwright/test';

export const STUDENT = {
  email: 'student@opensio.local',
  password: 'StudentOpenSIO2026!',
};

export const ADMIN = {
  email: 'admin@opensio.local',
  password: 'Admin12345678!',
};

export async function login(page: Page) {
  await page.goto('/login');

  // Champ email : maintenant correctement labélisé "Adresse Email"
  await page.getByLabel(/adresse email/i).fill(STUDENT.email);

  // Champ mot de passe : maintenant labélisé
await page.getByRole('textbox', { name: /mot de passe/i }).fill(STUDENT.password);

  // Bouton de soumission
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Attendre la redirection vers le catalogue
  await expect(page).toHaveURL(/\/catalogue/, { timeout: 15_000 });
}

export async function loginAdmin(page: Page) {
  await page.goto('/login');

  await page.getByLabel(/adresse email/i).fill(ADMIN.email);

  await page.getByRole('textbox', { name: /mot de passe/i }).fill(ADMIN.password);

  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Attendre la redirection vers le catalogue, le dashboard, ou admin
  await expect(page).toHaveURL(/\/catalogue|\/dashboard|\/admin/, { timeout: 15_000 });
}