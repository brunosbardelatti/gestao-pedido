import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

test('lists and filters completed sales with their operational actions', async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const api = 'http://127.0.0.1:3001/api/v1';

  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  const brand = (await (
    await page.request.post(`${api}/brands`, {
      data: { name: `Marca lista venda ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const category = (await (
    await page.request.post(`${api}/categories`, {
      data: { name: `Categoria lista venda ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const product = (await (
    await page.request.post(`${api}/products`, {
      data: {
        brandId: brand.data.id,
        categoryId: category.data.id,
        code: `LST-VEN-${suffix}`,
        description: `Produto lista venda ${suffix}`,
        catalogPrice: '15.00',
        purchasePrice: '6.00',
        originalPrice: '15.00',
        suggestedSalePrice: '12.00',
      },
    })
  ).json()) as { data: { id: string } };
  const customerName = `Cliente lista venda ${suffix}`;
  const customer = (await (
    await page.request.post(`${api}/customers`, { data: { name: customerName } })
  ).json()) as { data: { id: string } };
  await page.request.post(`${api}/inventory/adjustments`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      productId: product.data.id,
      type: 'CORRECTION',
      quantityDelta: 1,
      reason: 'Estoque para listar venda',
    },
  });
  await page.request.post(`${api}/sales`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      customerId: customer.data.id,
      paymentMethod: 'PIX',
      items: [{ productId: product.data.id, quantity: 1, unitPrice: '12.00' }],
    },
  });

  await page.goto('/sales');
  let saleRow = page.locator('details').filter({ hasText: customerName });
  await expect(
    saleRow.locator('summary').getByText(customerName, { exact: true }),
  ).toBeVisible();
  await expect(saleRow.locator('summary').getByText('R$ 12,00')).toBeVisible();
  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel('Situação').selectOption('COMPLETED');
  await page.getByLabel('Cliente').selectOption(customer.data.id);
  await page.getByLabel('Data inicial').fill(today);
  await page.getByLabel('Data final').fill(today);
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(
    new RegExp(`status=COMPLETED.*customerId=${customer.data.id}.*startDate=${today}.*endDate=${today}`),
  );
  saleRow = page.locator('details').filter({ hasText: customerName });
  await expect(saleRow).toBeVisible();
  await saleRow.locator('summary').click();
  await expect(page.getByText(`LST-VEN-${suffix} - Produto lista venda ${suffix}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Baixar recibo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar venda' })).toBeVisible();
});
