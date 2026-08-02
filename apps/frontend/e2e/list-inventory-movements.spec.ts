import { expect, test } from '@playwright/test';

test('lists a received order movement with its origin and filters', async ({
  page,
}) => {
  const suffix = Date.now();
  const brandName = `Marca Histórico ${suffix}`;
  const categoryName = `Categoria Histórico ${suffix}`;
  const productCode = `HIST-${suffix}`;
  const today = new Date().toISOString().slice(0, 10);
  const apiUrl = 'http://127.0.0.1:3001/api/v1';

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  const brandResponse = await page.request.post(`${apiUrl}/brands`, {
    data: { name: brandName },
  });
  const brandId = (await brandResponse.json()).data.id as string;
  const categoryResponse = await page.request.post(`${apiUrl}/categories`, {
    data: { name: categoryName },
  });
  const categoryId = (await categoryResponse.json()).data.id as string;
  const productResponse = await page.request.post(`${apiUrl}/products`, {
    data: {
      brandId,
      categoryId,
      code: productCode,
      description: 'Produto para histórico',
      catalogPrice: '100.00',
      purchasePrice: '60.00',
      originalPrice: '120.00',
    },
  });
  const productId = (await productResponse.json()).data.id as string;
  const orderResponse = await page.request.post(`${apiUrl}/orders`, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: {
      brandId,
      cycle: `Ciclo Histórico ${suffix}`,
      orderDate: today,
      items: [
        {
          productId,
          quantityOrdered: 2,
          catalogUnitPrice: '100.00',
          purchaseUnitPrice: '60.00',
          originalUnitPrice: '120.00',
        },
      ],
    },
  });
  const order = (await orderResponse.json()).data as {
    id: string;
    items: Array<{ id: string }>;
  };
  const receiptResponse = await page.request.post(
    `${apiUrl}/orders/${order.id}/receive`,
    {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      data: {
        items: [
          {
            orderItemId: order.items[0].id,
            quantityReceived: 2,
          },
        ],
      },
    },
  );
  expect(receiptResponse.ok()).toBe(true);

  await page.goto('/inventory');
  await page.getByRole('link', { name: 'Ver movimentações' }).click();
  await expect(page).toHaveURL('/inventory/movements');
  await page
    .getByLabel('Produto')
    .selectOption({ label: `${productCode} · Produto para histórico` });
  await page.getByLabel('Tipo').selectOption('PURCHASE');
  await page.getByLabel('Data inicial').fill(today);
  await page.getByLabel('Data final').fill(today);
  await page.getByRole('button', { name: 'Filtrar' }).click();

  await expect(page.getByText(productCode, { exact: true })).toBeVisible();
  await expect(
    page.getByRole('paragraph').filter({ hasText: /^Compra$/ }),
  ).toBeVisible();
  await expect(page.getByText('+2 unidades')).toBeVisible();
  await expect(page.getByText('Entrada por pedido')).toBeVisible();
  await expect(page.getByText('Administrador').last()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

});
