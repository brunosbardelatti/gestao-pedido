import { expect, test } from '@playwright/test';

test('creates a category and prevents a case-insensitive duplicate', async ({
  page,
}) => {
  const categoryName = `Categoria E2E ${Date.now()}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.getByRole('link', { name: 'Cadastrar categoria' }).click();
  await expect(page).toHaveURL('/categories/new');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel('Nome da categoria').fill(categoryName);
  await page.getByRole('button', { name: 'Cadastrar categoria' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Categoria ${categoryName} cadastrada.`,
  );

  await page.getByLabel('Nome da categoria').fill(categoryName.toUpperCase());
  await page.getByRole('button', { name: 'Cadastrar categoria' }).click();
  await expect(
    page.getByRole('alert').filter({
      hasText: 'Já existe uma categoria com este nome.',
    }),
  ).toHaveText('Já existe uma categoria com este nome.');
});
