import { expect, test } from '@playwright/test';

test('loads and updates an open order', async ({ page }) => {
  const suffix = Date.now();
  const brandName = `Marca Edição Pedido ${suffix}`;
  const categoryName = `Categoria Edição Pedido ${suffix}`;
  const productCode = `EDIT-PED-${suffix}`;

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

  await page.goto('/products/new');
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Categoria').selectOption({ label: categoryName });
  await page.getByLabel('Código do produto').fill(productCode);
  await page.getByLabel('Descrição').fill('Produto para editar pedido');
  await page.getByLabel('Preço de catálogo').fill('149,90');
  await page.getByLabel('Preço de compra').fill('89,00');
  await page.getByLabel('Preço original').fill('179,90');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Produto ${productCode} cadastrado.`,
  );

  await page.goto('/orders/new');
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Ciclo').fill('12/2026');
  await page
    .getByLabel('Produto do item 1')
    .selectOption({ label: `${productCode} · Produto para editar pedido` });
  await page.getByRole('button', { name: 'Criar pedido' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Pedido do ciclo 12/2026 criado.',
  );
  await page.getByRole('link', { name: 'Editar pedido' }).click();

  await expect(page.getByRole('heading', { name: 'Editar pedido' })).toBeVisible();
  await expect(page.getByLabel('Ciclo')).toHaveValue('12/2026');
  await expect(page.getByLabel('Produto do item 1')).toHaveValue(/.+/);
  await page.getByLabel('Ciclo').fill('13/2026');
  await page.getByLabel('Quantidade do item 1').fill('4');
  await page.getByLabel('Preço de compra do item 1').fill('99,90');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page.getByRole('status')).toContainText(
    'Pedido do ciclo 13/2026 atualizado.',
  );
  await expect(page.getByLabel('Quantidade do item 1')).toHaveValue('4');
  await expect(page.getByLabel('Preço de compra do item 1')).toHaveValue(
    '99.90',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
