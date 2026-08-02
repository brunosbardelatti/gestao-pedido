import { expect, test } from '@playwright/test';

test('lists and filters customers before opening the profile', async ({ page }) => {
  const suffix = Date.now().toString().slice(-9).padStart(9, '0');
  const mariaName = `Maria consulta ${suffix}`;
  const anaName = `Ana consulta ${suffix}`;
  const mariaCpf = `14${suffix}`;
  const anaCpf = `15${suffix}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  for (const customer of [
    { name: mariaName, cpf: mariaCpf, phone: '11987654321' },
    { name: anaName, cpf: anaCpf, phone: '21911112222' },
  ]) {
    await page.goto('/customers/new');
    await page.getByLabel('Nome').fill(customer.name);
    await page.getByLabel('CPF').fill(customer.cpf);
    await page.getByLabel('Telefone').fill(customer.phone);
    await page.getByRole('button', { name: 'Cadastrar cliente' }).click();
    await expect(page.getByRole('status')).toContainText(customer.name);
  }

  await page.goto('/');
  await page.getByRole('link', { name: 'Consultar clientes' }).click();
  await expect(page).toHaveURL('/customers');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel('Nome').fill(`consulta ${suffix}`);
  await page.getByLabel('Telefone').fill('9876');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByText(mariaName)).toBeVisible();
  await expect(page.getByText(anaName)).toHaveCount(0);

  await page.getByRole('link', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL('/customers');
  await page.getByLabel('CPF').fill(anaCpf);
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByText(anaName)).toBeVisible();
  await page.getByRole('link', { name: `Editar cliente ${anaName}` }).click();
  await expect(page.getByRole('heading', { name: 'Editar cliente' })).toBeVisible();
  await expect(page.getByLabel('Nome')).toHaveValue(anaName);
});
