import { expect, test } from '@playwright/test';

test('shows the ledger-derived current stock with combined filters', async ({
  page,
}) => {
  const suffix = Date.now();
  const brandName = `Marca Estoque ${suffix}`;
  const categoryName = `Categoria Estoque ${suffix}`;
  const productCode = `EST-${suffix}`;
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
  expect(brandResponse.ok()).toBe(true);
  const brandId = (await brandResponse.json()).data.id as string;

  const categoryResponse = await page.request.post(`${apiUrl}/categories`, {
    data: { name: categoryName },
  });
  expect(categoryResponse.ok()).toBe(true);
  const categoryId = (await categoryResponse.json()).data.id as string;

  const productResponse = await page.request.post(`${apiUrl}/products`, {
    data: {
      brandId,
      categoryId,
      code: productCode,
      description: 'Produto para saldo atual',
      catalogPrice: '149.90',
      purchasePrice: '89.00',
      originalPrice: '179.90',
      suggestedSalePrice: '169.90',
    },
  });
  expect(productResponse.ok()).toBe(true);
  const productId = (await productResponse.json()).data.id as string;

  const orderResponse = await page.request.post(`${apiUrl}/orders`, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: {
      brandId,
      cycle: `Ciclo Estoque ${suffix}`,
      orderDate: new Date().toISOString().slice(0, 10),
      items: [
        {
          productId,
          quantityOrdered: 3,
          catalogUnitPrice: '149.90',
          purchaseUnitPrice: '89.00',
          originalUnitPrice: '179.90',
        },
      ],
    },
  });
  expect(orderResponse.ok()).toBe(true);
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
            quantityReceived: 3,
          },
        ],
      },
    },
  );
  expect(receiptResponse.ok()).toBe(true);

  await page.goto('/inventory');
  await page.getByLabel('Código ou descrição').fill(productCode);
  await page.getByLabel('Marca').selectOption({ label: brandName });
  await page.getByLabel('Categoria').selectOption({ label: categoryName });
  await page.getByRole('button', { name: 'Filtrar' }).click();

  await expect(page.getByText(productCode, { exact: true })).toBeVisible();
  await expect(page.getByText('Produto para saldo atual')).toBeVisible();
  await expect(page.getByText('3 unidades')).toBeVisible();
  await expect(page.getByText('R$ 169,90')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByRole('link', { name: `Abrir produto ${productCode}` }).click();
  await expect(page.getByRole('heading', { name: 'Editar produto' })).toBeVisible();
  await expect(page.getByLabel('Código do produto')).toHaveValue(productCode);
});
