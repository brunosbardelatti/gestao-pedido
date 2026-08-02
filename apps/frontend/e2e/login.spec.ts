import { expect, test } from '@playwright/test';

test('authenticates and opens the protected workspace', async ({ page }) => {
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'Entre na sua conta' }),
  ).toBeVisible();
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(
    page.getByText('Login ou senha inválidos.', { exact: true }),
  ).toBeVisible();

  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Operação' })).toBeVisible();
  await expect(page.getByText('Administrador', { exact: true }).first()).toBeVisible();
});
