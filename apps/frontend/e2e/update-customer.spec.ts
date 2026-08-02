import { expect, test } from '@playwright/test';

test('loads and updates a customer profile', async ({ page }) => {
  const suffix = Date.now().toString().slice(-9).padStart(9, '0');
  const originalName = `Cliente edição ${suffix}`;
  const updatedName = `Cliente atualizado ${suffix}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/customers/new');
  await page.getByLabel('Nome').fill(originalName);
  await page.getByLabel('CPF').fill(`13${suffix}`);
  await page.getByLabel('Cidade').fill('Sao Paulo');
  await page.getByLabel('UF').fill('sp');
  await page.getByRole('button', { name: 'Cadastrar cliente' }).click();
  await page.getByRole('link', { name: `Editar ${originalName}` }).click();

  await expect(page.getByRole('heading', { name: 'Editar cliente' })).toBeVisible();
  await expect(page.getByLabel('Nome')).toHaveValue(originalName);
  await expect(page.getByLabel('Cidade')).toHaveValue('Sao Paulo');
  await page.getByLabel('Nome').fill(updatedName);
  await page.getByLabel('CPF').fill('');
  await page.getByLabel('Cidade').fill('Campinas');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Cliente ${updatedName} atualizado.`,
  );

  await page.reload();
  await expect(page.getByLabel('Nome')).toHaveValue(updatedName);
  await expect(page.getByLabel('CPF')).toHaveValue('');
  await expect(page.getByLabel('Cidade')).toHaveValue('Campinas');
});
