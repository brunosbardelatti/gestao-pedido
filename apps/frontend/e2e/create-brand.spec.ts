import { expect, test } from '@playwright/test';

test('creates, updates and prevents a case-insensitive duplicate brand', async ({
  page,
}) => {
  const brandName = `Marca E2E ${Date.now()}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.getByRole('link', { name: 'Cadastrar marca' }).click();
  await expect(page).toHaveURL('/brands/new');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel('Nome da marca').fill(brandName);
  await page.getByRole('button', { name: 'Cadastrar marca' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Marca ${brandName} cadastrada.`,
  );

  await page.getByRole('link', { name: `Editar ${brandName}` }).click();
  await expect(page.getByRole('heading', { name: 'Editar marca' })).toBeVisible();
  await expect(page.getByLabel('Nome da marca')).toHaveValue(brandName);

  const updatedName = `${brandName} Atualizada`;
  await page.getByLabel('Nome da marca').fill(updatedName);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Marca ${updatedName} atualizada.`,
  );

  await page.goto('/brands/new');
  await page.getByLabel('Nome da marca').fill(updatedName.toUpperCase());
  await page.getByRole('button', { name: 'Cadastrar marca' }).click();
  await expect(
    page.getByRole('alert').filter({
      hasText: 'Já existe uma marca com este nome.',
    }),
  ).toHaveText('Já existe uma marca com este nome.');
});
