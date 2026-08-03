import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

test('consolidates completed sales for the selected period', async ({ page }) => {
  const suffix = Date.now().toString().slice(-8);
  const api = 'http://127.0.0.1:3001/api/v1';
  const today = new Date().toISOString().slice(0, 10);

  await page.goto('/login');
  await page.getByLabel('Login').fill('admin');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/');

  const baseline = (await (
    await page.request.get(
      `${api}/reports/sales?startDate=${today}&endDate=${today}`,
    )
  ).json()) as {
    data: { salesCount: number; itemsCount: number; revenue: string };
  };
  const brand = (await (
    await page.request.post(`${api}/brands`, {
      data: { name: `Marca relatório vendas ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const category = (await (
    await page.request.post(`${api}/categories`, {
      data: { name: `Categoria relatório vendas ${suffix}` },
    })
  ).json()) as { data: { id: string } };
  const product = (await (
    await page.request.post(`${api}/products`, {
      data: {
        brandId: brand.data.id,
        categoryId: category.data.id,
        code: `REL-VEN-${suffix}`,
        description: `Produto relatório vendas ${suffix}`,
        catalogPrice: '15.00',
        purchasePrice: '6.00',
        originalPrice: '15.00',
        suggestedSalePrice: '11.25',
      },
    })
  ).json()) as { data: { id: string } };
  await page.request.post(`${api}/inventory/adjustments`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      productId: product.data.id,
      type: 'CORRECTION',
      quantityDelta: 2,
      reason: 'Estoque para validar relatório de vendas',
    },
  });
  await page.request.post(`${api}/sales`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      items: [{ productId: product.data.id, quantity: 2, unitPrice: '11.25' }],
    },
  });

  await page.getByRole('link', { name: 'Vendas por período' }).click();
  await page.getByLabel('Data inicial').fill(today);
  await page.getByLabel('Data final').fill(today);
  await page.getByRole('button', { name: 'Consultar' }).click();

  const expectedRevenue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(baseline.data.revenue) + 22.5);
  const expectedSales = baseline.data.salesCount + 1;
  const expectedItems = baseline.data.itemsCount + 2;
  await expect(page).toHaveURL(
    new RegExp(`startDate=${today}.*endDate=${today}`),
  );
  await expect(page.getByText(expectedRevenue, { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      `${expectedSales} ${expectedSales === 1 ? 'venda' : 'vendas'}`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      `${expectedItems} ${expectedItems === 1 ? 'item vendido' : 'itens vendidos'}`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText('Somente vendas concluídas')).toBeVisible();
});
