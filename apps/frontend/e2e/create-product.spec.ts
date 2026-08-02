import { expect, test } from '@playwright/test';

test('creates a product with catalog references and rejects a duplicate', async ({
  page,
}) => {
  const suffix = Date.now();
  const brandName = `Marca Produto E2E ${suffix}`;
  const categoryName = `Categoria Produto E2E ${suffix}`;
  const productCode = `PROD-${suffix}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/brands/new');
  await page.getByLabel('Nome da marca').fill(brandName);
  await page.getByRole('button', { name: 'Cadastrar marca' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Marca ${brandName} cadastrada.`,
  );

  await page.goto('/categories/new');
  await page.getByLabel('Nome da categoria').fill(categoryName);
  await page.getByRole('button', { name: 'Cadastrar categoria' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Categoria ${categoryName} cadastrada.`,
  );

  await page.goto('/');
  await page.getByRole('link', { name: 'Cadastrar produto' }).click();
  await expect(page).toHaveURL('/products/new');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Categoria').selectOption({ label: categoryName });
  await page.getByLabel('Código do produto').fill(productCode);
  await page.getByLabel('Descrição').fill('Produto E2E');
  await page.getByLabel('Preço de catálogo').fill('149,90');
  await page.getByLabel('Preço de compra').fill('89,00');
  await page.getByLabel('Preço original').fill('179,90');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Produto ${productCode} cadastrado.`,
  );

  await page.getByLabel('Código do produto').fill(productCode.toLowerCase());
  await page.getByLabel('Descrição').fill('Produto E2E duplicado');
  await page.getByLabel('Preço de catálogo').fill('149,90');
  await page.getByLabel('Preço de compra').fill('89,00');
  await page.getByLabel('Preço original').fill('179,90');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();
  await expect(
    page.getByRole('alert').filter({
      hasText: 'Já existe um produto com este código para a marca informada.',
    }),
  ).toHaveText(
    'Já existe um produto com este código para a marca informada.',
  );
});
