import { expect, test } from '@playwright/test';

test('creates a customer and prevents a duplicate CPF', async ({ page }) => {
  const suffix = Date.now().toString().slice(-9).padStart(9, '0');
  const cpf = `12${suffix}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.getByRole('link', { name: 'Cadastrar cliente' }).click();
  await expect(page).toHaveURL('/customers/new');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByLabel('Nome').fill(`Cliente E2E ${suffix}`);
  await page.getByLabel('CPF').fill(cpf);
  await page.getByLabel('Telefone').fill('11999998888');
  await page.getByLabel('Cidade').fill('Sao Paulo');
  await page.getByLabel('UF').fill('sp');
  await page.getByRole('button', { name: 'Cadastrar cliente' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Cliente Cliente E2E ${suffix} cadastrado.`,
  );

  await page.goto('/customers/new');
  await page.getByLabel('Nome').fill(`CPF repetido ${suffix}`);
  await page.getByLabel('CPF').fill(cpf);
  await page.getByRole('button', { name: 'Cadastrar cliente' }).click();
  await expect(
    page.getByRole('alert').filter({
      hasText: 'Já existe um cliente com este CPF.',
    }),
  ).toHaveText('Já existe um cliente com este CPF.');
});
