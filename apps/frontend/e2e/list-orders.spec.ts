import { expect, test } from '@playwright/test';

test('lists and filters orders before opening the aggregate', async ({ page }) => {
  const suffix = Date.now();
  const brandName = `Marca Lista Pedido ${suffix}`;
  const categoryName = `Categoria Lista Pedido ${suffix}`;
  const productCode = `LST-PED-${suffix}`;
  const cycle = `Ciclo Lista ${suffix}`;

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
  await page.getByLabel('Descrição').fill('Produto para lista de pedidos');
  await page.getByLabel('Preço de catálogo').fill('149,90');
  await page.getByLabel('Preço de compra').fill('89,00');
  await page.getByLabel('Preço original').fill('179,90');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Produto ${productCode} cadastrado.`,
  );

  await page.goto('/orders/new');
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Ciclo').fill(cycle);
  await page
    .getByLabel('Produto do item 1')
    .selectOption({ label: `${productCode} · Produto para lista de pedidos` });
  await page.getByLabel('Quantidade do item 1').fill('4');
  await page.getByRole('button', { name: 'Criar pedido' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Pedido do ciclo ${cycle} criado.`,
  );

  await page.goto('/orders');
  await page.getByLabel('Situação').selectOption('OPEN');
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Ciclo', { exact: true }).fill(`  ${cycle}  `);
  await page.getByRole('button', { name: 'Filtrar' }).click();

  await expect(page).toHaveURL(/status=OPEN/);
  await expect(page.getByText(cycle, { exact: true })).toBeVisible();
  await expect(
    page.locator('span').filter({ hasText: /^Em aberto$/ }),
  ).toBeVisible();
  await expect(page.getByText('1 produto / 4 unidades')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByRole('link', { name: `Abrir pedido ${cycle}` }).click();
  await expect(page.getByRole('heading', { name: 'Editar pedido' })).toBeVisible();
  await expect(page.getByLabel('Ciclo', { exact: true })).toHaveValue(cycle);
});
