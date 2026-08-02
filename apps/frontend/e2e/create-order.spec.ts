import { expect, test } from '@playwright/test';

test('creates an order with two products from the same brand', async ({
  page,
}) => {
  const suffix = Date.now();
  const brandName = `Marca Pedido E2E ${suffix}`;
  const categoryName = `Categoria Pedido E2E ${suffix}`;
  const firstCode = `PED-${suffix}-1`;
  const secondCode = `PED-${suffix}-2`;
  const cycle = `Ciclo ${suffix}`;

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
  await page.getByLabel('Código do produto').fill(firstCode);
  await page.getByLabel('Descrição').fill('Primeiro produto do pedido');
  await page.getByLabel('Preço de catálogo').fill('149,90');
  await page.getByLabel('Preço de compra').fill('89,00');
  await page.getByLabel('Preço original').fill('179,90');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Produto ${firstCode} cadastrado.`,
  );

  await page.getByLabel('Código do produto').fill(secondCode);
  await page.getByLabel('Descrição').fill('Segundo produto do pedido');
  await page.getByLabel('Preço de catálogo').fill('99,90');
  await page.getByLabel('Preço de compra').fill('59,00');
  await page.getByLabel('Preço original').fill('119,90');
  await page.getByRole('button', { name: 'Cadastrar produto' }).click();
  await expect(page.getByRole('status')).toContainText(
    `Produto ${secondCode} cadastrado.`,
  );

  await page.goto('/');
  await page.getByRole('link', { name: 'Criar pedido' }).click();
  await expect(page).toHaveURL('/orders/new');
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Ciclo').fill(cycle);
  await page
    .getByLabel('Produto do item 1')
    .selectOption({ label: `${firstCode} · Primeiro produto do pedido` });
  await expect(page.getByLabel('Preço de compra do item 1')).toHaveValue(
    '89.00',
  );
  await page.getByRole('button', { name: 'Adicionar item' }).click();
  await page
    .getByLabel('Produto do item 2')
    .selectOption({ label: `${secondCode} · Segundo produto do pedido` });
  await page.getByLabel('Quantidade do item 2').fill('3');
  await page.getByRole('button', { name: 'Criar pedido' }).click();

  await expect(page.getByRole('status')).toContainText(
    `Pedido do ciclo ${cycle} criado.`,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
